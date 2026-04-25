import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepGroup {
  label: string;
  product_ids: string[];
}

export interface PromoStep {
  title: string;
  groups: StepGroup[];
}

interface StepProduct {
  id: string;
  name: string;
  image_url: string | null;
}

export interface StepSelection {
  stepTitle: string;
  groupLabel: string;
  product: StepProduct;
}

interface PromoStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: PromoStep[];
  onConfirm: (selections: StepSelection[]) => void;
}

const PromoStepsDialog = ({ open, onOpenChange, steps, onConfirm }: PromoStepsDialogProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<'group' | 'product'>('group');
  const [selectedGroup, setSelectedGroup] = useState<StepGroup | null>(null);
  const [products, setProducts] = useState<StepProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<StepSelection[]>([]);

  useEffect(() => {
    if (!open) {
      setCurrentStepIndex(0);
      setPhase('group');
      setSelectedGroup(null);
      setProducts([]);
      setSelections([]);
    }
  }, [open]);

  const currentStep = steps[currentStepIndex];

  const handleSelectGroup = async (group: StepGroup) => {
    if (group.product_ids.length === 0) return;
    setSelectedGroup(group);
    setPhase('product');
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, image_url')
        .in('id', group.product_ids)
        .eq('is_active', true);
      if (data) setProducts(data as StepProduct[]);
    } catch (e) {
      console.error('Failed to fetch products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: StepProduct) => {
    if (!selectedGroup || !currentStep) return;

    const newSelection: StepSelection = {
      stepTitle: currentStep.title,
      groupLabel: selectedGroup.label,
      product,
    };
    const updatedSelections = [...selections, newSelection];

    // Move to next step or finish
    if (currentStepIndex < steps.length - 1) {
      setSelections(updatedSelections);
      setCurrentStepIndex(currentStepIndex + 1);
      setPhase('group');
      setSelectedGroup(null);
      setProducts([]);
    } else {
      onConfirm(updatedSelections);
    }
  };

  const handleBack = () => {
    if (phase === 'product') {
      setPhase('group');
      setSelectedGroup(null);
      setProducts([]);
    } else if (currentStepIndex > 0) {
      setSelections(selections.slice(0, -1));
      setCurrentStepIndex(currentStepIndex - 1);
      setPhase('group');
      setSelectedGroup(null);
      setProducts([]);
    }
  };

  if (!currentStep) return null;

  const showBack = phase === 'product' || currentStepIndex > 0;
  const stepLabel = `Etapa ${currentStepIndex + 1} de ${steps.length}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {phase === 'product' && selectedGroup ? selectedGroup.label : currentStep.title}
          </DialogTitle>
          {steps.length > 1 && (
            <p className="text-xs text-muted-foreground">{stepLabel}</p>
          )}
        </DialogHeader>

        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        {phase === 'group' && (
          <div className="grid grid-cols-1 gap-3">
            {currentStep.groups.map((group) => (
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

        {phase === 'product' && (
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

export default PromoStepsDialog;
