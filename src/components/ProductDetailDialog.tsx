import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { Minus, Plus, X, Image as ImageIcon, Gift, CirclePlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_popular: boolean;
  category_id: string;
  categories?: { name: string; slug: string; icon: string } | null;
}

interface UpsellOffer {
  id: string;
  upsell_product_id: string;
  extra_price: number;
  label: string;
  upsell_product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

interface ProductAddon {
  id: string;
  name: string;
  price: number;
  category_id: string;
  section: string | null;
  is_active: boolean;
}

interface ProductSize {
  id: string;
  label: string;
  price: number;
  sort_order: number;
}

interface ProductDetailDialogProps {
  item: ProductItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductDetailDialog = ({ item, open, onOpenChange }: ProductDetailDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [upsells, setUpsells] = useState<UpsellOffer[]>([]);
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (open && item.id) {
      fetchUpsells();
      fetchAddons();
      fetchSizes();
      setSelectedUpsells(new Set());
      setSelectedAddons(new Map());
      setSelectedSizeId(null);
      setQuantity(1);
    }
  }, [open, item.id]);

  const fetchUpsells = async () => {
    const { data } = await (supabase as any)
      .from('product_upsells')
      .select('id, upsell_product_id, extra_price, label')
      .eq('product_id', item.id)
      .eq('is_active', true)
      .order('sort_order');

    if (data && data.length > 0) {
      const upsellIds = data.map(u => u.upsell_product_id);
      const { data: upsellProducts } = await (supabase as any)
        .from('products')
        .select('id, name, price, image_url')
        .in('id', upsellIds);

      const enriched = data.map(u => ({
        ...u,
        upsell_product: upsellProducts?.find(p => p.id === u.upsell_product_id),
      }));
      setUpsells(enriched);
    } else {
      setUpsells([]);
    }
  };

  const fetchAddons = async () => {
    const { data } = await (supabase as any)
      .from('product_addons')
      .select('id, name, price, category_id, category_ids, section, is_active')
      .eq('is_active', true)
      .order('sort_order');
    // Filter client-side: addon applies if category_ids contains item.category_id, or fallback to category_id
    const filtered = ((data as unknown as ProductAddon[]) || []).filter(a => {
      const ids = (a as any).category_ids?.length ? (a as any).category_ids : [a.category_id];
      return ids.includes(item.category_id);
    });
    setAddons(filtered);
  };

  const fetchSizes = async () => {
    const { data } = await (supabase as any)
      .from('product_sizes')
      .select('id, label, price, sort_order')
      .eq('product_id', item.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at');
    const sizeData = (data || []) as ProductSize[];
    setSizes(sizeData);
    // Auto-select cheapest size
    if (sizeData.length > 0) {
      const cheapest = sizeData.reduce((min, s) => s.price < min.price ? s : min, sizeData[0]);
      setSelectedSizeId(cheapest.id);
    }
  };

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeAddonQty = (id: string, delta: number) => {
    setSelectedAddons(prev => {
      const next = new Map(prev);
      const current = next.get(id) || 0;
      const newVal = Math.max(0, current + delta);
      if (newVal === 0) next.delete(id);
      else next.set(id, newVal);
      return next;
    });
  };

  // Current effective price (size price or base price)
  const selectedSize = sizes.find(s => s.id === selectedSizeId);
  const effectivePrice = selectedSize ? selectedSize.price : Number(item.price);

  const upsellTotal = upsells
    .filter(u => selectedUpsells.has(u.id))
    .reduce((sum, u) => sum + Number(u.extra_price), 0);

  const addonsTotal = addons.reduce((sum, a) => {
    const qty = selectedAddons.get(a.id) || 0;
    return sum + Number(a.price) * qty;
  }, 0);

  const total = (effectivePrice + upsellTotal + addonsTotal) * quantity;
  const categorySlug = item.categories?.slug;

  const handleAddToCart = () => {
    const cartAddons = addons
      .filter(a => (selectedAddons.get(a.id) || 0) > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        price: Number(a.price),
        quantity: selectedAddons.get(a.id)!,
      }));

    const sizeSuffix = selectedSize ? ` (${selectedSize.label})` : '';

    addItem({
      id: `${item.id}-${selectedSizeId || 'base'}-${Date.now()}`,
      item: {
        id: item.id,
        name: item.name + sizeSuffix,
        description: item.description,
        price: effectivePrice + addonsTotal,
        image: item.image_url || '',
        category: (categorySlug as 'hamburgueres' | 'acai' | 'bebidas') || 'hamburgueres',
      },
      quantity,
      addBatata: false,
      bebida: null,
      addons: cartAddons.length > 0 ? cartAddons : undefined,
      totalPrice: (effectivePrice + addonsTotal) * quantity,
    });

    // Add selected upsells as separate cart items
    upsells
      .filter(u => selectedUpsells.has(u.id) && u.upsell_product)
      .forEach(u => {
        addItem({
          id: `${u.upsell_product!.id}-upsell-${Date.now()}`,
          item: {
            id: u.upsell_product!.id,
            name: u.upsell_product!.name,
            description: `Oferta combo com ${item.name}`,
            price: Number(u.extra_price),
            image: u.upsell_product!.image_url || '',
            category: (categorySlug as 'hamburgueres' | 'acai' | 'bebidas') || 'hamburgueres',
          },
          quantity,
          addBatata: false,
          bebida: null,
          totalPrice: Number(u.extra_price) * quantity,
        });
      });

    const upsellNames = upsells
      .filter(u => selectedUpsells.has(u.id) && u.upsell_product)
      .map(u => u.upsell_product!.name);

    const addonNames = addons
      .filter(a => (selectedAddons.get(a.id) || 0) > 0)
      .map(a => `${selectedAddons.get(a.id)}x ${a.name}`);

    const extraNames = [...upsellNames, ...addonNames];

    toast({
      title: 'Adicionado ao carrinho!',
      description: `${quantity}x ${item.name}${sizeSuffix}${extraNames.length > 0 ? ` + ${extraNames.join(', ')}` : ''} - ${formatPrice(total)}`,
    });

    setQuantity(1);
    setSelectedUpsells(new Set());
    setSelectedAddons(new Map());
    setSelectedSizeId(sizes.length > 0 ? sizes.reduce((min, s) => s.price < min.price ? s : min, sizes[0]).id : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-card border-border overflow-hidden max-h-[90vh] flex flex-col md:flex-row md:items-stretch">
        <div className="relative md:w-1/2 flex-shrink-0 flex items-center justify-center bg-black/90">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-contain max-h-[35vh] md:max-h-[90vh]"
            />
          ) : (
            <div className="w-full bg-muted flex items-center justify-center min-h-[16rem]">
              <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 md:hidden p-2 bg-card/80 backdrop-blur rounded-full"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="md:w-1/2 flex flex-col overflow-y-auto">
          <div className="p-6 flex-1">
            <DialogTitle className="text-2xl font-bold text-foreground mb-2">
              {item.name}
            </DialogTitle>
            <p className="text-muted-foreground mb-4">{item.description}</p>
            <span
              className={cn(
                'text-2xl font-bold',
                categorySlug === 'acai' ? 'text-acai' : 'text-primary'
              )}
            >
              {sizes.length > 0 && selectedSize ? formatPrice(selectedSize.price) : formatPrice(Number(item.price))}
            </span>

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <span className="text-sm font-semibold text-foreground mb-3 block">Escolha o tamanho</span>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSizeId(s.id)}
                      className={cn(
                        'px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200',
                        selectedSizeId === s.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {s.label} — {formatPrice(s.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Addons grouped by section */}
            {addons.length > 0 && (() => {
              const sections = new Map<string, ProductAddon[]>();
              addons.forEach(a => {
                const key = a.section || '__default__';
                if (!sections.has(key)) sections.set(key, []);
                sections.get(key)!.push(a);
              });
              return Array.from(sections.entries()).map(([sectionKey, sectionAddons]) => (
                <div key={sectionKey} className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CirclePlus className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {sectionKey === '__default__' ? 'Adicione no seu pedido' : sectionKey}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sectionAddons.map(a => {
                      const qty = selectedAddons.get(a.id) || 0;
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                            !a.is_active
                              ? 'border-border opacity-50 cursor-not-allowed'
                              : qty > 0
                                ? 'border-primary bg-primary/10'
                                : 'border-border'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{a.name}</p>
                              {!a.is_active && (
                                <span className="text-[10px] font-bold uppercase bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                                  Indisponível
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-primary whitespace-nowrap">
                            + {formatPrice(Number(a.price))}
                          </span>
                          {a.is_active && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => changeAddonQty(a.id, -1)}
                                disabled={qty === 0}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-border transition-colors disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-semibold text-foreground">{qty}</span>
                              <button
                                onClick={() => changeAddonQty(a.id, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {/* Upsell Offers */}
            {upsells.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Aproveite também!</span>
                </div>
                <div className="space-y-2">
                  {upsells.map(u => (
                    <button
                      key={u.id}
                      onClick={() => toggleUpsell(u.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
                        selectedUpsells.has(u.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        selectedUpsells.has(u.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
                      )}>
                        {selectedUpsells.has(u.id) && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.label}</p>
                        {u.upsell_product && (
                          <p className="text-xs text-muted-foreground">{u.upsell_product.name}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        + {formatPrice(Number(u.extra_price))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card sticky bottom-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-muted rounded-full p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-card text-foreground hover:bg-border transition-colors disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-card text-foreground hover:bg-border transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className={cn(
                  'flex-1 py-3 rounded-full font-semibold transition-all duration-300',
                  'hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between px-6',
                  categorySlug === 'acai'
                    ? 'gradient-acai text-secondary-foreground'
                    : 'gradient-burger text-primary-foreground'
                )}
              >
                <span>Adicionar</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
