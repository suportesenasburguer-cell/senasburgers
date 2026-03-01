import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Smartphone, Monitor, Tablet, Globe, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface Visit {
  id: string;
  visitor_id: string;
  device_type: string;
  os: string;
  browser: string;
  screen_width: number;
  screen_height: number;
  referrer: string | null;
  created_at: string;
}

const PERIODS = [
  { key: 'today' as const, label: 'Hoje' },
  { key: 'week' as const, label: '7 dias' },
  { key: 'month' as const, label: '30 dias' },
  { key: 'all' as const, label: 'Total' },
];

const PIE_COLORS = [
  'hsl(25, 95%, 53%)',
  'hsl(270, 60%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(45, 90%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(340, 70%, 55%)',
];

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const AdminVisitas = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin/login');
  }, [user, isAdmin, authLoading, navigate]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('site_visits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);
    setVisits(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchVisits();
  }, [isAdmin, fetchVisits]);

  const getFiltered = () => {
    const now = new Date();
    return visits.filter(v => {
      if (period === 'all') return true;
      const d = new Date(v.created_at);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago;
      }
      if (period === 'month') {
        const ago = new Date(now); ago.setDate(ago.getDate() - 30); return d >= ago;
      }
      return true;
    });
  };

  const filtered = getFiltered();
  const uniqueVisitors = new Set(filtered.map(v => v.visitor_id)).size;
  const totalVisits = filtered.length;
  const mobileCount = filtered.filter(v => v.device_type === 'mobile').length;
  const mobilePercent = totalVisits > 0 ? Math.round((mobileCount / totalVisits) * 100) : 0;

  // Device breakdown
  const deviceData = Object.entries(
    filtered.reduce((acc, v) => {
      const label = v.device_type === 'mobile' ? 'Celular' : v.device_type === 'tablet' ? 'Tablet' : 'Desktop';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // OS breakdown
  const osData = Object.entries(
    filtered.reduce((acc, v) => {
      acc[v.os || 'Outro'] = (acc[v.os || 'Outro'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Browser breakdown
  const browserData = Object.entries(
    filtered.reduce((acc, v) => {
      acc[v.browser || 'Outro'] = (acc[v.browser || 'Outro'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Visits per day
  const visitsByDay = (() => {
    const days: Record<string, { total: number; unique: Set<string> }> = {};
    filtered.forEach(v => {
      const d = new Date(v.created_at);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[key]) days[key] = { total: 0, unique: new Set() };
      days[key].total++;
      days[key].unique.add(v.visitor_id);
    });
    return Object.entries(days).reverse().slice(0, 14).reverse()
      .map(([day, data]) => ({ day, visitas: data.total, unicos: data.unique.size }));
  })();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub, accent = false }: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/30">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent ? "gradient-burger" : "bg-muted")}>
            <Icon className={cn("w-4 h-4", accent ? "text-primary-foreground" : "text-muted-foreground")} />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className={cn("text-2xl font-bold", accent ? "text-gradient-burger" : "text-foreground")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );

  const ChartCard = ({ title, children, className: cls }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("rounded-2xl border border-border bg-card p-5", cls)}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );

  const CustomTooltip = ({ active: a, payload, label }: any) => {
    if (!a || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold text-foreground">
            {p.name === 'unicos' ? 'Únicos' : 'Visitas'}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Visitantes</h1>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {PERIODS.map(f => (
              <button
                key={f.key}
                onClick={() => setPeriod(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  period === f.key
                    ? "gradient-burger text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Visitantes únicos" value={String(uniqueVisitors)} accent />
          <StatCard icon={Globe} label="Total de visitas" value={String(totalVisits)} />
          <StatCard icon={Smartphone} label="Mobile" value={`${mobilePercent}%`} sub={`${mobileCount} visitas`} />
          <StatCard icon={Monitor} label="Desktop" value={`${totalVisits > 0 ? 100 - mobilePercent : 0}%`} sub={`${totalVisits - mobileCount} visitas`} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Visitas por dia" className="lg:col-span-2">
            {visitsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={visitsByDay}>
                  <defs>
                    <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="visitas" stroke="hsl(25, 95%, 53%)" strokeWidth={2} fill="url(#visitGrad)" />
                  <Area type="monotone" dataKey="unicos" stroke="hsl(270, 60%, 55%)" strokeWidth={2} fill="url(#uniqueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Sem dados no período
              </div>
            )}
          </ChartCard>

          {/* Device Pie */}
          <ChartCard title="Dispositivos">
            {deviceData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {deviceData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {deviceData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>
        </div>

        {/* OS & Browser */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Sistema Operacional">
            {osData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={osData} layout="vertical" barSize={20}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 12 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {osData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>

          <ChartCard title="Navegador">
            {browserData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={browserData} layout="vertical" barSize={20}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 12 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {browserData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>
        </div>

        {/* Recent visits table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Últimas visitas</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Dispositivo</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Sistema</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Navegador</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Tela</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((v, idx) => {
                  const DevIcon = DEVICE_ICONS[v.device_type] || Globe;
                  return (
                    <tr key={v.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 && "bg-muted/5")}>
                      <td className="py-3 px-5 text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <DevIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-foreground capitalize">{v.device_type === 'mobile' ? 'Celular' : v.device_type === 'tablet' ? 'Tablet' : 'Desktop'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs text-foreground">{v.os || '—'}</td>
                      <td className="py-3 px-5 text-xs text-foreground">{v.browser || '—'}</td>
                      <td className="py-3 px-5 text-xs text-muted-foreground">{v.screen_width}×{v.screen_height}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma visita no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVisitas;
