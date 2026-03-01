import { useState, useEffect } from 'react';
import { useProducts, useCategories } from '@/hooks/use-products';
import MenuItemCard from './MenuItemCard';
import { Loader2, GripVertical, Tag, Clock } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DbProduct } from '@/hooks/use-products';

interface SortableMenuItemProps {
  item: DbProduct;
  index: number;
  isAdminMode: boolean;
}

const SortableMenuItem = ({ item, index, isAdminMode }: SortableMenuItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isAdminMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isAdminMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing p-1 rounded-md bg-card/80 border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <MenuItemCard item={item} index={index} />
    </div>
  );
};

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

const formatPrice = (price: number) =>
  price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MenuSection = () => {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { isAdmin } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data } = await (supabase as any)
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (data) setPromotions(data as unknown as Promotion[]);
      } catch (e) {
        console.error('Failed to fetch promotions:', e);
      }
    };
    fetchPromotions();
  }, []);

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
      isPromo: true,
    });
    toast({
      title: 'Promoção adicionada!',
      description: `${promo.title} - ${formatPrice(promo.promo_price)}`,
    });
  };

  const isLoading = loadingProducts || loadingCategories;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group products by category_id
  const groupedByCategory = categories
    .map((cat) => ({
      ...cat,
      items: products.filter((p) => p.category_id === cat.id),
    }))
    .filter((group) => group.items.length > 0);

  const handleDragEnd = async (event: DragEndEvent, items: DbProduct[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Update sort_order for all affected items
    const updates = reordered.map((item, idx) => 
      (supabase as any).from('products').update({ sort_order: idx }).eq('id', item.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <section id="menu" className="py-16 px-4">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Nosso <span className="text-gradient-burger">Cardápio</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Escolha entre nossos deliciosos hambúrgueres artesanais e tradicionais
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : groupedByCategory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum item encontrado.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Promoções como primeira seção */}
            {promotions.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Tag className="w-7 h-7 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">Promoções</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                          <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Tag className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      </div>
                      {/* Content */}
                      <div className="p-5">
                        <h3 className="text-xl font-bold text-foreground mb-2">{promo.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground line-through">{formatPrice(promo.original_price)}</span>
                            <span className="text-2xl font-bold text-primary block">{formatPrice(promo.promo_price)}</span>
                          </div>
                          <button onClick={() => handleAddPromo(promo)} className="gradient-burger text-primary-foreground px-5 py-2 rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95">
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {groupedByCategory.map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-6">
                  <CategoryIcon name={group.icon} className="w-7 h-7 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">{group.name}</h3>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, group.items)}
                >
                  <SortableContext items={group.items.map((i) => i.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {group.items.map((item, index) => (
                        <SortableMenuItem
                          key={item.id}
                          item={item}
                          index={index}
                          isAdminMode={isAdmin}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MenuSection;
