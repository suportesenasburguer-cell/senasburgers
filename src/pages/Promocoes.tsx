import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { Tag, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Promotion {
  id: string;
  title: string;
  description: string;
  original_price: number;
  promo_price: number;
  image_url: string | null;
  valid_until: string;
  items: string[];
  is_active: boolean;
  sort_order: number;
}

const Promocoes = () => {
  const { addItem } = useCart();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (data) setPromotions(data as unknown as Promotion[]);
        if (error) console.error('Error fetching promotions:', error);
      } catch (e) {
        console.error('Failed to fetch promotions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, []);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleAddPromo = (promo: Promotion) => {
    addItem({
      id: `${promo.id}-${Date.now()}`,
      item: {
        id: promo.id,
        name: promo.title,
        description: promo.description,
        price: promo.promo_price,
        image: promo.image_url || '',
        category: 'hamburgueres',
      },
      quantity: 1,
      addBatata: false,
      bebida: null,
      totalPrice: promo.promo_price,
    });

    toast({
      title: 'Promoção adicionada!',
      description: `${promo.title} - ${formatPrice(promo.promo_price)}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        {/* Header */}
        <div className="text-center mb-10 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Ofertas <span className="text-gradient-burger">Imperdíveis</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Aproveite nossas promoções especiais e economize!
          </p>
        </div>

        {promotions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Nenhuma promoção disponível no momento</p>
            <p className="text-sm mt-1">Volte mais tarde para conferir nossas ofertas!</p>
          </div>
        )}

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promo, index) => (
            <div
              key={promo.id}
              className={cn(
                'group relative bg-card rounded-2xl overflow-hidden border border-border',
                'hover:border-primary/50 transition-all duration-500',
                'hover:shadow-[0_8px_32px_hsl(var(--primary)/0.2)]',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Discount Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="gradient-acai text-secondary-foreground text-sm font-bold px-3 py-1 rounded-full">
                  {Math.round((1 - promo.promo_price / promo.original_price) * 100)}% OFF
                </span>
              </div>

              {/* Valid Until Badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className="flex items-center gap-1 bg-card/80 backdrop-blur text-foreground text-xs font-medium px-3 py-1 rounded-full border border-border">
                  <Clock className="w-3 h-3" />
                  {promo.valid_until}
                </span>
              </div>

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                {promo.image_url ? (
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Tag className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {promo.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {promo.description}
                </p>

                {/* Items List */}
                {promo.items && promo.items.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {promo.items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(promo.original_price)}
                    </span>
                    <span className="text-2xl font-bold text-primary block">
                      {formatPrice(promo.promo_price)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddPromo(promo)}
                    className="gradient-burger text-primary-foreground px-5 py-2 rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Promocoes;
