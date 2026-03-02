import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, TrendingUp, Package, DollarSign, ShoppingBag,
  CalendarDays, Wallet, PlusCircle, Trash2, TrendingDown, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  item_count: number;
  payment_method: string;
  delivery_type: string;
  created_at: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const EXPENSE_CATEGORIES = [
  'Ingredientes', 'Embalagens', 'Gás', 'Funcionários',
  'Aluguel', 'Marketing', 'Manutenção', 'Outros'
];

const PERIODS = [
  { key: 'today' as const, label: 'Hoje' },
  { key: 'yesterday' as const, label: 'Ontem' },
  { key: 'week' as const, label: '7 dias' },
  { key: 'month' as const, label: 'Este mês' },
  { key: 'last_month' as const, label: 'Mês anterior' },
  { key: 'all' as const, label: 'Total' },
];

type PeriodKey = typeof PERIODS[number]['key'];

const PIE_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(270, 60%, 55%)', 'hsl(160, 60%, 45%)',
  'hsl(45, 90%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(340, 70%, 55%)',
  'hsl(120, 50%, 45%)', 'hsl(30, 80%, 50%)',
];

const STATUS_COLORS = ['hsl(45, 90%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(0, 70%, 55%)'];

const AdminRelatorios = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('today');

  // Expenses state (localStorage)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('admin-expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: EXPENSE_CATEGORIES[0], date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    localStorage.setItem('admin-expenses', JSON.stringify(expenses));
  }, [expenses]);

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

  const filterByPeriod = <T extends { created_at?: string; date?: string }>(items: T[], periodKey: PeriodKey): T[] => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return items.filter(item => {
      const dateStr = (item as any).created_at || (item as any).date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (periodKey === 'all') return true;
      if (periodKey === 'today') return d.toDateString() === now.toDateString();
      if (periodKey === 'yesterday') return d.toDateString() === yesterday.toDateString();
      if (periodKey === 'week') {
        const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago;
      }
      if (periodKey === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (periodKey === 'last_month') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      }
      return true;
    });
  };

  const filtered = filterByPeriod(orders, period);
  const filteredExpenses = filterByPeriod(expenses.map(e => ({ ...e, created_at: e.date })), period);

  const completed = filtered.filter(o => o.status === 'completed' || o.status === 'delivered');
  const cancelled = filtered.filter(o => o.status === 'cancelled');
  const active = filtered.filter(o => !['completed', 'delivered', 'cancelled'].includes(o.status));
  const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
  const totalItems = completed.reduce((s, o) => s + o.item_count, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e as any).amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Chart data
  const paymentData = Object.entries(
    completed.reduce((acc, o) => {
      const label = o.payment_method === 'pix' ? 'PIX' : o.payment_method === 'cartao' ? 'Cartão' : o.payment_method === 'dinheiro' ? 'Dinheiro' : o.payment_method || 'Outro';
      acc[label] = (acc[label] || 0) + Number(o.total);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const deliveryData = Object.entries(
    filtered.reduce((acc, o) => {
      const key = o.delivery_type === 'delivery' ? 'Entrega' : 'Retirada';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const revenueByDay = (() => {
    const days: Record<string, { revenue: number; expenses: number }> = {};
    completed.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[key]) days[key] = { revenue: 0, expenses: 0 };
      days[key].revenue += Number(o.total);
    });
    filteredExpenses.forEach((e: any) => {
      const key = new Date(e.date || e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[key]) days[key] = { revenue: 0, expenses: 0 };
      days[key].expenses += e.amount;
    });
    return Object.entries(days).reverse().slice(0, 14).reverse().map(([day, data]) => ({ day, ...data }));
  })();

  const expensesByCategory = Object.entries(
    filteredExpenses.reduce((acc, e: any) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const statusData = [
    { name: 'Ativos', value: active.length },
    { name: 'Finalizados', value: completed.length },
    { name: 'Cancelados', value: cancelled.length },
  ].filter(d => d.value > 0);

  const handleAddExpense = () => {
    if (!newExpense.description.trim() || !newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    const expense: Expense = {
      id: crypto.randomUUID(),
      description: newExpense.description.trim(),
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: new Date(newExpense.date + 'T12:00:00').toISOString(),
    };
    setExpenses(prev => [expense, ...prev]);
    setNewExpense({ description: '', amount: '', category: EXPENSE_CATEGORIES[0], date: new Date().toISOString().split('T')[0] });
    setShowExpenseDialog(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, accent = false, negative = false }: { icon: any; label: string; value: string; accent?: boolean; negative?: boolean }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent ? "gradient-burger" : negative ? "bg-red-500/10" : "bg-muted")}>
            <Icon className={cn("w-4 h-4", accent ? "text-primary-foreground" : negative ? "text-red-500" : "text-muted-foreground")} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
        </div>
        <p className={cn("text-xl font-bold", accent ? "text-gradient-burger" : negative ? "text-red-500" : "text-foreground")}>{value}</p>
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
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.value > 10 ? fmt(p.value) : p.value}
          </p>
        ))}
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
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Relatórios
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 rounded-xl p-1.5">
          {PERIODS.map(f => (
            <button
              key={f.key}
              onClick={() => setPeriod(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                period === f.key
                  ? "gradient-burger text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={DollarSign} label="Faturamento" value={fmt(totalRevenue)} accent />
          <StatCard icon={Package} label="Pedidos concluídos" value={String(completed.length)} />
          <StatCard icon={ShoppingBag} label="Itens vendidos" value={String(totalItems)} />
          <StatCard icon={TrendingUp} label="Ticket médio" value={avgTicket > 0 ? fmt(avgTicket) : '—'} />
          <StatCard icon={TrendingDown} label="Gastos" value={fmt(totalExpenses)} negative />
          <StatCard icon={Wallet} label="Lucro líquido" value={fmt(netProfit)} accent={netProfit > 0} negative={netProfit < 0} />
        </div>

        {/* Revenue vs Expenses Chart */}
        <ChartCard title="Faturamento vs Gastos por dia" className="lg:col-span-2">
          {revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} tickFormatter={v => `R$${v}`} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(150, 60%, 45%)" strokeWidth={2} fill="url(#revGradient)" />
                <Area type="monotone" dataKey="expenses" name="Gastos" stroke="hsl(0, 70%, 55%)" strokeWidth={2} fill="url(#expGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Sem dados no período</div>
          )}
        </ChartCard>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Pie */}
          <ChartCard title="Status dos pedidos">
            {statusData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
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
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Sem pedidos</div>
            )}
          </ChartCard>

          {/* Payment Breakdown */}
          <ChartCard title="Formas de pagamento">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={paymentData} layout="vertical" barSize={20}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 12 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Valor" radius={[0, 8, 8, 0]}>
                    {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>

          {/* Expenses by Category */}
          <ChartCard title="Gastos por categoria">
            {expensesByCategory.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                  {expensesByCategory.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Nenhum gasto registrado</div>
            )}
          </ChartCard>
        </div>

        {/* Delivery Type + small stat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Tipo de entrega">
            {deliveryData.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px]">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={deliveryData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {deliveryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
              <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </ChartCard>

          {/* Margin summary */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-foreground mb-4">Resumo Financeiro</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita bruta</span>
                <span className="font-bold text-foreground">{fmt(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de gastos</span>
                <span className="font-bold text-red-500">- {fmt(totalExpenses)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Lucro líquido</span>
                <span className={cn("text-lg font-bold", netProfit >= 0 ? "text-green-500" : "text-red-500")}>
                  {fmt(netProfit)}
                </span>
              </div>
              {totalRevenue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Margem de lucro</span>
                  <span className={cn("text-sm font-semibold", netProfit >= 0 ? "text-green-500" : "text-red-500")}>
                    {((netProfit / totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expenses Management */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Controle de Gastos
            </h3>
            <Button size="sm" className="gradient-burger text-primary-foreground gap-1 rounded-lg" onClick={() => setShowExpenseDialog(true)}>
              <PlusCircle className="w-4 h-4" /> Adicionar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Descrição</th>
                  <th className="text-left py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Categoria</th>
                  <th className="text-right py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Valor</th>
                  <th className="text-center py-3 px-5 text-xs text-muted-foreground font-medium uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum gasto registrado no período</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp: any, idx: number) => (
                    <tr key={exp.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 && "bg-muted/5")}>
                      <td className="py-3 px-5 text-xs text-muted-foreground">
                        {new Date(exp.date || exp.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="py-3 px-5 text-foreground">{exp.description}</td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{exp.category}</span>
                      </td>
                      <td className="py-3 px-5 text-right font-semibold text-red-500">{fmt(exp.amount)}</td>
                      <td className="py-3 px-5 text-center">
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                {filtered.slice(0, 20).map((order, idx) => (
                  <tr key={order.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 && "bg-muted/5")}>
                    <td className="py-3 px-5 font-mono text-xs text-foreground">#{order.id.slice(0, 8).toUpperCase()}</td>
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

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-foreground">Descrição</Label>
              <Input
                placeholder="Ex: Compra de pães"
                value={newExpense.description}
                onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))}
                className="bg-background border-border mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-foreground">Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                  className="bg-background border-border mt-1"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-sm text-foreground">Data</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))}
                  className="bg-background border-border mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm text-foreground">Categoria</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EXPENSE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewExpense(p => ({ ...p, category: cat }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      newExpense.category === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddExpense} className="w-full gradient-burger text-primary-foreground">
              Salvar Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRelatorios;
