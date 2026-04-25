import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Save } from 'lucide-react';

interface StoreHour {
  id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const DEFAULT_HOURS: StoreHour[] = [
  { day_of_week: 0, is_open: true, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 1, is_open: true, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 2, is_open: true, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 3, is_open: false, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 4, is_open: true, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 5, is_open: true, open_time: '18:15', close_time: '23:00' },
  { day_of_week: 6, is_open: true, open_time: '18:15', close_time: '23:00' },
];

const StoreHoursTab = () => {
  const [hours, setHours] = useState<StoreHour[]>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('store_hours')
      .select('*')
      .order('day_of_week');

    if (error) {
      console.error('Error fetching store hours:', error);
      // If table doesn't exist, use defaults from localStorage or hardcoded
      const saved = localStorage.getItem('store_hours');
      if (saved) {
        setHours(JSON.parse(saved));
      }
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setHours(data);
    } else {
      // Seed default hours
      await seedDefaults();
    }
    setLoading(false);
  };

  const seedDefaults = async () => {
    const { data, error } = await (supabase as any)
      .from('store_hours')
      .insert(DEFAULT_HOURS)
      .select();

    if (error) {
      console.error('Error seeding store hours:', error);
      return;
    }
    if (data) setHours(data);
  };

  const updateDay = (dayOfWeek: number, field: keyof StoreHour, value: any) => {
    setHours(prev =>
      prev.map(h =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const saveDay = async (dayOfWeek: number) => {
    setSavingDay(dayOfWeek);
    const dayData = hours.find(h => h.day_of_week === dayOfWeek);
    if (!dayData) return;

    const payload = {
      is_open: dayData.is_open,
      open_time: dayData.open_time,
      close_time: dayData.close_time,
    };

    // Also save to localStorage as fallback
    localStorage.setItem('store_hours', JSON.stringify(hours));

    if (dayData.id) {
      const { error } = await (supabase as any)
        .from('store_hours')
        .update(payload)
        .eq('id', dayData.id);

      if (error) {
        console.error('Error updating store hours:', error);
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setSavingDay(null);
        return;
      }
    } else {
      const { error } = await (supabase as any)
        .from('store_hours')
        .upsert({ ...payload, day_of_week: dayOfWeek }, { onConflict: 'day_of_week' });

      if (error) {
        console.error('Error upserting store hours:', error);
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setSavingDay(null);
        return;
      }
    }

    toast({ title: `${DAY_LABELS[dayOfWeek]} atualizado!` });
    setSavingDay(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Horário Semanal</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Ative ou desative dias da semana e ajuste os horários de funcionamento.
      </p>

      <div className="space-y-3">
        {hours
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((day) => (
            <div
              key={day.day_of_week}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                day.is_open
                  ? 'bg-card border-border'
                  : 'bg-muted/30 border-border/50'
              }`}
            >
              <Switch
                checked={day.is_open}
                onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
              />

              <span
                className={`font-semibold min-w-[130px] ${
                  day.is_open ? 'text-foreground' : 'text-muted-foreground line-through'
                }`}
              >
                {DAY_LABELS[day.day_of_week]}
              </span>

              {day.is_open ? (
                <>
                  <Input
                    type="time"
                    value={day.open_time}
                    onChange={(e) => updateDay(day.day_of_week, 'open_time', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground text-sm">às</span>
                  <Input
                    type="time"
                    value={day.close_time}
                    onChange={(e) => updateDay(day.day_of_week, 'close_time', e.target.value)}
                    className="w-28"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveDay(day.day_of_week)}
                    disabled={savingDay === day.day_of_week}
                  >
                    {savingDay === day.day_of_week ? '...' : 'Salvar'}
                  </Button>
                </>
              ) : (
                <span className="text-destructive text-sm font-medium">Fechado</span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default StoreHoursTab;
