import { useProducts, useCategories } from '@/hooks/use-products';
import MenuItemCard from './MenuItemCard';
import { Loader2, GripVertical } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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

const MenuSection = () => {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

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
            Escolha entre nossos deliciosos hambúrgueres artesanais e açaís cremosos
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
