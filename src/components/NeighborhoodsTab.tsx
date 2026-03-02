import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Neighborhood {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  sort_order: number;
}

const formatPrice = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const NeighborhoodsTab = () => {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');

  const fetchNeighborhoods = async () => {
    const { data, error } = await (supabase as any)
      .from('delivery_neighborhoods')
      .select('*')
      .order('name');
    if (!error && data) setNeighborhoods(data);
    setLoading(false);
  };

  useEffect(() => { fetchNeighborhoods(); }, []);

  const resetForm = () => {
    setName('');
    setFee('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !fee) return;
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0) return;

    if (editingId) {
      const { error } = await (supabase as any)
        .from('delivery_neighborhoods')
        .update({ name: name.trim(), fee: feeNum })
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Erro ao atualizar bairro', variant: 'destructive' });
        return;
      }
      toast({ title: 'Bairro atualizado!' });
    } else {
      const { error } = await (supabase as any)
        .from('delivery_neighborhoods')
        .insert({ name: name.trim(), fee: feeNum, is_active: true, sort_order: neighborhoods.length });
      if (error) {
        toast({ title: 'Erro ao adicionar bairro', variant: 'destructive' });
        return;
      }
      toast({ title: 'Bairro adicionado!' });
    }
    resetForm();
    fetchNeighborhoods();
  };

  const toggleActive = async (n: Neighborhood) => {
    await (supabase as any)
      .from('delivery_neighborhoods')
      .update({ is_active: !n.is_active })
      .eq('id', n.id);
    fetchNeighborhoods();
  };

  const deleteNeighborhood = async (id: string) => {
    if (!confirm('Excluir este bairro?')) return;
    await (supabase as any).from('delivery_neighborhoods').delete().eq('id', id);
    toast({ title: 'Bairro excluído' });
    fetchNeighborhoods();
  };

  const editNeighborhood = (n: Neighborhood) => {
    setEditingId(n.id);
    setName(n.name);
    setFee(n.fee.toString());
    setShowForm(true);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Bairros e Taxas de Entrega</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gradient-burger text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Bairro
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-foreground">{editingId ? 'Editar Bairro' : 'Novo Bairro'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do Bairro</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Centro" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Taxa de Entrega (R$)</label>
              <Input type="number" step="0.5" min="0" value={fee} onChange={e => setFee(e.target.value)} placeholder="Ex: 5.00" className="bg-background border-border" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="gradient-burger text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {neighborhoods.map(n => (
          <div key={n.id} className={cn(
            'bg-card border rounded-xl p-4 flex items-center justify-between gap-3',
            n.is_active ? 'border-border' : 'border-destructive/30 opacity-60'
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                n.is_active ? 'bg-primary/15' : 'bg-muted'
              )}>
                <MapPin className={cn('w-4 h-4', n.is_active ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{n.name}</p>
                <p className="text-xs text-primary font-bold">{formatPrice(n.fee)}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => toggleActive(n)} title={n.is_active ? 'Desativar' : 'Ativar'}>
                {n.is_active ? <span className="w-2 h-2 rounded-full bg-green-400" /> : <span className="w-2 h-2 rounded-full bg-red-400" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => editNeighborhood(n)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteNeighborhood(n.id)} className="hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {neighborhoods.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum bairro cadastrado</p>
          <p className="text-sm mt-1">Adicione bairros para definir taxas de entrega</p>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodsTab;
