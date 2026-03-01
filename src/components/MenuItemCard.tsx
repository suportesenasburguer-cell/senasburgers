import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ProductDetailDialog from './ProductDetailDialog';
import { Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MenuItemCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_popular: boolean;
    is_active: boolean;
    category_id: string;
    categories?: { name: string; slug: string; icon: string } | null;
  };
  index: number;
}

const MenuItemCard = ({ item, index }: MenuItemCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchSizes = async () => {
      const { data } = await (supabase as any)
        .from('product_sizes')
        .select('price')
        .eq('product_id', item.id)
        .eq('is_active', true)
        .order('price');
      if (data && data.length > 0) {
        setLowestPrice(data[0].price);
      }
    };
    fetchSizes();
  }, [item.id]);

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const categorySlug = item.categories?.slug;
  const displayPrice = lowestPrice !== null ? lowestPrice : item.price;
  const hasMultipleSizes = lowestPrice !== null;

  return (
    <>
      <div
        onClick={() => item.is_active && setDialogOpen(true)}
        className={cn(
          'group relative bg-card rounded-xl overflow-hidden border border-border',
          'transition-all duration-300 animate-fade-in flex',
          item.is_active
            ? 'cursor-pointer hover:border-primary/50 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.15)]'
            : 'opacity-60 cursor-not-allowed'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {!item.is_active && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Indisponível
            </span>
          </div>
        )}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          {item.is_popular && item.is_active && (
            <span className="inline-block gradient-burger text-primary-foreground text-xs font-bold px-2 py-0.5 rounded mb-2 w-fit">
              MAIS PEDIDO
            </span>
          )}

          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.description}
            </p>
          </div>

          <div>
            {hasMultipleSizes && (
              <span className="text-xs text-muted-foreground">A partir de </span>
            )}
            <span
              className={cn(
                'text-lg font-bold',
                categorySlug === 'acai' ? 'text-acai' : 'text-primary'
              )}
            >
              {formatPrice(displayPrice)}
            </span>
          </div>
        </div>

        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 m-3">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-muted flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </div>

      <ProductDetailDialog
        item={item}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default MenuItemCard;
