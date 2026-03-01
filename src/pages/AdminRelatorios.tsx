import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Package, DollarSign, ShoppingBag, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  item_count: number;
  payment_method: string;
  delivery_type: string;
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
];

const AdminRelatorios = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin/login');
  }, [user, isAdmin, authLoading, navigate]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('customer_orders')
      .select('id, total, status, item_count, payment_method, delivery_type, created_at')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin, fetchOrders]);

  const fmt = (price: number) =>
    Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getFilteredOrders = () => {
    const now = new Date();
    return orders.filter(o => {
      if (period === 'all') return true;
      const d = new Date(o.created_at);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filtered = getFilteredOrders();
  const completed = filtered.filter(o => o.status === 'completed' || o.status === 'delivered');
  const cancelled = filtered.filter(o => o.status === 'cancelled');
  const active = filtered.filter(o => !['completed', 'delivered', 'cancelled'].includes(o.status));
  const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
  const totalItems = completed.reduce((s, o) => s + o.item_count, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  // Chart data: payment breakdown
  const paymentData = Object.entries(
    completed.reduce((acc, o) => {
      const label = o.payment_method === 'pix' ? 'PIX' : o.payment_method === 'cartao' ? 'Cartão' : o.payment_method === 'dinheiro' ? 'Dinheiro' : o.payment_method || 'Outro';
      acc[label] = (acc[label] || 0) + Number(o.total);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Chart data: delivery breakdown
  const deliveryData = Object.entries(
    filtered.reduce((acc, o) => {
      const key = o.delivery_type === 'delivery' ? 'Entrega' : 'Retirada';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Chart data: daily revenue (last 7 days or period)
  const revenueByDay = (() => {
    const days: Record<string, number> = {};
    completed.forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days[key] = (days[key] || 0) + Number(o.total);
    });
    return Object.entries(days).reverse().slice(0, 14).reverse().map(([day, total]) => ({ day, total }));
  })();

  // Status data for pie
  const statusData = [
    { name: 'Ativos', value: active.length },
    { name: 'Finalizados', value: completed.length },
    { name: 'Cancelados', value: cancelled.length },
  ].filter(d => d.value > 0);

  const STATUS_COLORS = ['hsl(45, 90%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(0, 70%, 55%)'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, accent = false }: { icon: any; label: string; value: string; accent?: boolean }) => (
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
        <p className="text-sm font-bold text-foreground">{typeof payload[0].value === 'number' && payload[0].value > 100 ? fmt(payload[0].value) : payload[0].value}</p>
      </div>
    );
  };

  const statusLabels: Record<string, string> = {
    sent: 'Recebido', preparing: 'Preparando', delivering: 'Entregando',
    delivered: 'Entregue', completed: 'Finalizado', cancelled: 'Cancelado',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Relatórios</h1>
            </div>
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
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Faturamento" value={fmt(totalRevenue)} accent />
          <StatCard icon={Package} label="Finalizados" value={String(completed.length)} />
          <StatCard icon={ShoppingBag} label="Itens vendidos" value={String(totalItems)} />
          <StatCard icon={TrendingUp} label="Ticket médio" value={avgTicket > 0 ? fmt(avgTicket) : '—'} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <ChartCard title="Faturamento por dia" className="lg:col-span-2">
            {revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="hsl(25, 95%, 53%)" strokeWidth={2} fill="url(#revGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Sem dados no período
              </div>
            )}
          </ChartCard>

          {/* Status Pie */}
          <ChartCard title="Status dos pedidos">
            {statusData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {statusData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Sem pedidos
              </div>
            )}
          </ChartCard>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Breakdown */}
          <ChartCard title="Formas de pagamento">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={paymentData} layout="vertical" barSize={20}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 12 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>

          {/* Delivery Breakdown */}
          <ChartCard title="Tipo de entrega">
            {deliveryData.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px]">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={deliveryData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                      {deliveryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1">
                  {deliveryData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Últimos pedidos</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} pedidos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Pedido</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Itens</th>
                  <th className="text-right py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 15).map((order, idx) => (
                  <tr key={order.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 && "bg-muted/5")}>
                    <td className="py-3 px-5 font-mono text-xs text-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-5 text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-5">
                      <span className={cn(
                        'inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full',
                        order.status === 'completed' || order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                        order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      )}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center text-muted-foreground">{order.item_count}</td>
                    <td className="py-3 px-5 text-right font-semibold text-foreground">{fmt(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum pedido no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRelatorios;
