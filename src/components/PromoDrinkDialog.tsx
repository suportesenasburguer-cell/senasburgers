import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrinkGroup {
  label: string;
  product_ids: string[];
}

interface DrinkProduct {
  id: string;
  name: string;
  image_url: string | null;
}

interface PromoDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinkGroups: DrinkGroup[];
  onConfirm: (selectedDrink: { groupLabel: string; product: DrinkProduct }) => void;
}

const PromoDrinkDialog = ({ open, onOpenChange, drinkGroups, onConfirm }: PromoDrinkDialogProps) => {
  const [step, setStep] = useState<'group' | 'product'>('group');
  const [selectedGroup, setSelectedGroup] = useState<DrinkGroup | null>(null);
  const [products, setProducts] = useState<DrinkProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('group');
      setSelectedGroup(null);
      setProducts([]);
    }
  }, [open]);

  const handleSelectGroup = async (group: DrinkGroup) => {
    setSelectedGroup(group);
    setStep('product');
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, image_url')
        .in('id', group.product_ids)
        .eq('is_active', true);
      if (data) setProducts(data as DrinkProduct[]);
    } catch (e) {
      console.error('Failed to fetch drink products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: DrinkProduct) => {
    if (selectedGroup) {
      onConfirm({ groupLabel: selectedGroup.label, product });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 'group' ? 'Escolha sua bebida' : selectedGroup?.label}
          </DialogTitle>
        </DialogHeader>

        {step === 'product' && (
          <button
            onClick={() => { setStep('group'); setSelectedGroup(null); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        {step === 'group' && (
          <div className="grid grid-cols-1 gap-3">
            {drinkGroups.map((group) => (
              <button
                key={group.label}
                onClick={() => handleSelectGroup(group)}
                className={cn(
                  'flex items-center justify-center p-4 rounded-xl border border-border',
                  'bg-card hover:border-primary/50 hover:bg-primary/5 transition-all',
                  'text-foreground font-semibold text-lg'
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        )}

        {step === 'product' && (
          loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum produto disponível</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border border-border',
                    'bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left'
                  )}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted" />
                  )}
                  <span className="text-foreground font-medium">{product.name}</span>
                </button>
              ))}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PromoDrinkDialog;
