import { useState } from 'react';
import { useCoupons, Coupon } from '@/hooks/use-coupons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, X, Ticket, PauseCircle, PlayCircle } from 'lucide-react';

const COUPON_TYPES = [
  { value: 'percentage', label: 'Desconto %' },
  { value: 'fixed', label: 'Valor Fixo (R$)' },
  { value: 'free_delivery', label: 'Frete Grátis' },
] as const;

const CouponsTab = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as Coupon['type'],
    value: '',
    is_active: true,
    expires_at: '',
  });

  const resetForm = () => {
    setForm({ code: '', type: 'percentage', value: '', is_active: true, expires_at: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.code.trim()) {
      toast({ title: 'Preencha o código do cupom', variant: 'destructive' });
      return;
    }
    if (form.type !== 'free_delivery' && (!form.value || parseFloat(form.value) <= 0)) {
      toast({ title: 'Preencha o valor do desconto', variant: 'destructive' });
      return;
    }
    if (form.type === 'percentage' && parseFloat(form.value) > 100) {
      toast({ title: 'Percentual máximo é 100%', variant: 'destructive' });
      return;
    }

    const data = {
      code: form.code,
      type: form.type,
      value: form.type === 'free_delivery' ? 0 : parseFloat(form.value),
      is_active: form.is_active,
      expires_at: form.expires_at || null,
    };

    if (editing) {
      updateCoupon(editing.id, data);
      toast({ title: 'Cupom atualizado!' });
    } else {
      addCoupon(data);
      toast({ title: 'Cupom criado!' });
    }
    resetForm();
  };

  const handleEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: c.type === 'free_delivery' ? '' : String(c.value),
      is_active: c.is_active,
      expires_at: c.expires_at || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteCoupon(id);
    toast({ title: 'Cupom removido!' });
  };

  const getTypeLabel = (type: string) =>
    COUPON_TYPES.find(t => t.value === type)?.label || type;

  const formatValue = (c: Coupon) => {
    if (c.type === 'percentage') return `${c.value}%`;
    if (c.type === 'fixed') return `R$ ${c.value.toFixed(2)}`;
    return 'Frete Grátis';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">Gerencie cupons de desconto</p>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-burger text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Novo Cupom
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editing ? 'Editar Cupom' : 'Novo Cupom'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Código *</label>
              <Input
                placeholder="Ex: PROMO10"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="uppercase"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as Coupon['type'] }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {COUPON_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {form.type !== 'free_delivery' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {form.type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'} *
                </label>
                <Input
                  type="number"
                  placeholder={form.type === 'percentage' ? 'Ex: 10' : 'Ex: 5.00'}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  min="0"
                  max={form.type === 'percentage' ? '100' : undefined}
                  step={form.type === 'percentage' ? '1' : '0.01'}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Validade (opcional)</label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              Ativo
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} className="gradient-burger text-primary-foreground">
              {editing ? 'Atualizar' : 'Criar Cupom'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      <div className="space-y-3">
        {coupons.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Ticket className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-mono font-bold text-foreground">{c.code}</p>
                <p className="text-sm text-muted-foreground">
                  {getTypeLabel(c.type)} — {formatValue(c)}
                  {c.expires_at && ` • Até ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  updateCoupon(c.id, { is_active: !c.is_active });
                  toast({ title: c.is_active ? 'Cupom desativado' : 'Cupom ativado' });
                }}
                title={c.is_active ? 'Desativar' : 'Ativar'}
              >
                {c.is_active ? <PlayCircle className="w-4 h-4 text-green-500" /> : <PauseCircle className="w-4 h-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {coupons.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum cupom cadastrado</p>
          <p className="text-sm mt-1">Crie cupons de desconto para seus clientes</p>
        </div>
      )}
    </div>
  );
};

export default CouponsTab;
