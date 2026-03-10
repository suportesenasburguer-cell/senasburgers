import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Clock, CalendarOff, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

interface WeeklyHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface ManualClosure {
  id: string;
  closure_date: string;
  reason: string | null;
}

const StoreHoursTab = () => {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  // New closure form
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureReason, setNewClosureReason] = useState('');
  const [addingClosure, setAddingClosure] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [hoursRes, closuresRes] = await Promise.all([
      (supabase as any).from('store_weekly_hours').select('*').order('day_of_week'),
      (supabase as any).from('store_manual_closures').select('*').order('closure_date'),
    ]);
    if (hoursRes.data) setWeeklyHours(hoursRes.data);
    if (closuresRes.data) setClosures(closuresRes.data);
    setLoading(false);
  };

  const toggleDay = async (day: WeeklyHour) => {
    setSaving(day.day_of_week);
    const { error } = await (supabase as any)
      .from('store_weekly_hours')
      .update({ is_open: !day.is_open })
      .eq('id', day.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setWeeklyHours(prev => prev.map(d => d.id === day.id ? { ...d, is_open: !d.is_open } : d));
      toast({ title: `${DAY_LABELS[day.day_of_week]} ${!day.is_open ? 'aberto' : 'fechado'}` });
    }
    setSaving(null);
  };

  const updateTime = async (day: WeeklyHour, field: 'open_time' | 'close_time', value: string) => {
    setWeeklyHours(prev => prev.map(d => d.id === day.id ? { ...d, [field]: value } : d));
  };

  const saveTime = async (day: WeeklyHour) => {
    setSaving(day.day_of_week);
    const current = weeklyHours.find(d => d.id === day.id);
    if (!current) return;
    const { error } = await (supabase as any)
      .from('store_weekly_hours')
      .update({ open_time: current.open_time, close_time: current.close_time })
      .eq('id', day.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Horário de ${DAY_LABELS[day.day_of_week]} atualizado!` });
    }
    setSaving(null);
  };

  const addClosure = async () => {
    if (!newClosureDate) {
      toast({ title: 'Selecione uma data', variant: 'destructive' });
      return;
    }
    setAddingClosure(true);
    const { error } = await (supabase as any)
      .from('store_manual_closures')
      .insert({ closure_date: newClosureDate, reason: newClosureReason || null });
    if (error) {
      toast({ title: 'Erro ao adicionar fechamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Fechamento manual adicionado!' });
      setNewClosureDate('');
      setNewClosureReason('');
      fetchData();
    }
    setAddingClosure(false);
  };

  const deleteClosure = async (id: string) => {
    const { error } = await (supabase as any)
      .from('store_manual_closures')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Fechamento removido!' });
      setClosures(prev => prev.filter(c => c.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Weekly Schedule */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Horário Semanal</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ative ou desative dias da semana e ajuste os horários de funcionamento.
        </p>

        <div className="space-y-3">
          {weeklyHours.map(day => (
            <div
              key={day.id}
              className={cn(
                'flex items-center gap-4 bg-card border rounded-xl p-4 transition-all',
                day.is_open ? 'border-border' : 'border-destructive/30 opacity-70'
              )}
            >
              <Switch
                checked={day.is_open}
                onCheckedChange={() => toggleDay(day)}
                disabled={saving === day.day_of_week}
              />
              <span className={cn(
                'font-semibold min-w-[130px]',
                day.is_open ? 'text-foreground' : 'text-muted-foreground line-through'
              )}>
                {DAY_LABELS[day.day_of_week]}
              </span>

              {day.is_open ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={day.open_time}
                    onChange={e => updateTime(day, 'open_time', e.target.value)}
                    className="w-[120px] bg-background border-border"
                  />
                  <span className="text-muted-foreground text-sm">às</span>
                  <Input
                    type="time"
                    value={day.close_time}
                    onChange={e => updateTime(day, 'close_time', e.target.value)}
                    className="w-[120px] bg-background border-border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveTime(day)}
                    disabled={saving === day.day_of_week}
                  >
                    {saving === day.day_of_week ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-destructive font-medium">Fechado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manual Closures */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">Fechamentos Manuais</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Feche a loja em datas específicas por imprevistos ou feriados. Mesmo que o dia esteja ativo no horário semanal, o fechamento manual prevalece.
        </p>

        {/* Add closure form */}
        <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-xl p-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
            <Input
              type="date"
              value={newClosureDate}
              min={today}
              onChange={e => setNewClosureDate(e.target.value)}
              className="w-[170px] bg-background border-border"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground mb-1 block">Motivo (opcional)</label>
            <Input
              placeholder="Ex: Feriado, reforma, etc."
              value={newClosureReason}
              onChange={e => setNewClosureReason(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <Button
            onClick={addClosure}
            disabled={addingClosure}
            className="gradient-burger text-primary-foreground"
          >
            {addingClosure ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Adicionar
          </Button>
        </div>

        {/* Closures list */}
        {closures.length > 0 ? (
          <div className="space-y-2">
            {closures.map(c => {
              const isPast = c.closure_date < today;
              const [y, m, d] = c.closure_date.split('-');
              const dateLabel = `${d}/${m}/${y}`;
              const dayOfWeek = new Date(c.closure_date + 'T12:00:00').getDay();

              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 bg-card border rounded-lg px-4 py-3',
                    isPast ? 'opacity-50 border-border' : 'border-destructive/30'
                  )}
                >
                  <CalendarOff className={cn('w-4 h-4 flex-shrink-0', isPast ? 'text-muted-foreground' : 'text-destructive')} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground text-sm">
                      {DAY_LABELS[dayOfWeek]}, {dateLabel}
                    </span>
                    {c.reason && (
                      <span className="text-muted-foreground text-sm ml-2">— {c.reason}</span>
                    )}
                    {isPast && <span className="text-xs text-muted-foreground ml-2">(passado)</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteClosure(c.id)}
                    className="hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum fechamento manual programado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreHoursTab;
