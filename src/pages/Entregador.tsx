import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Truck, CheckCircle2, Clock, MapPin, Phone, User, LogOut,
  DollarSign, Package, RefreshCw, ChevronDown, ChevronUp,
  BarChart3, CalendarDays, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: string | null;
}

interface DeliveryOrder {
  id: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  address: string | null;
  observation: string | null;
  status: string;
  item_count: number;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  reference_point: string | null;
  delivered_at: string | null;
  items?: OrderItem[];
}

type Tab = 'entregas' | 'relatorios';

const PERIODS = [
  { key: 'today' as const, label: 'Hoje' },
  { key: 'yesterday' as const, label: 'Ontem' },
  { key: 'week' as const, label: '7 dias' },
  { key: 'month' as const, label: 'Este mês' },
  { key: 'all' as const, label: 'Total' },
];
type PeriodKey = typeof PERIODS[number]['key'];

const PIE_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(270, 60%, 55%)', 'hsl(160, 60%, 45%)',
  'hsl(45, 90%, 55%)', 'hsl(200, 70%, 50%)',
];

const Entregador = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'delivered'>('pending');
  const [tab, setTab] = useState<Tab>('entregas');
  const [period, setPeriod] = useState<PeriodKey>('today');

  // Auth check
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { navigate('/conta/login'); return; }
      setUser(u);

      const { data: hasRole } = await (supabase as any).rpc('has_role', {
        _user_id: u.id,
        _role: 'driver',
      });

      if (!hasRole) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão de entregador.', variant: 'destructive' });
        navigate('/');
        return;
      }

      setIsDriver(true);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    const { data: ordersData } = await (supabase as any)
      .from('customer_orders')
      .select('*')
      .eq('driver_id', user.id)
      .in('delivery_type', ['delivery'])
      .order('created_at', { ascending: false });

    if (!ordersData) { setOrders([]); return; }

    const orderIds = ordersData.map((o: any) => o.id);
    if (orderIds.length > 0) {
      const { data: itemsData } = await (supabase as any)
        .from('customer_order_items')
        .select('*')
        .in('order_id', orderIds);

      const withItems = ordersData.map((o: any) => ({
        ...o,
        items: (itemsData || []).filter((i: any) => i.order_id === o.id),
      }));
      setOrders(withItems);
    } else {
      setOrders([]);
    }
  }, [user]);

  useEffect(() => {
    if (isDriver && user) fetchOrders();
  }, [isDriver, user, fetchOrders]);

  // Real-time updates
  useEffect(() => {
    if (!isDriver || !user) return;
    const channel = (supabase as any)
      .channel('driver-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customer_orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [isDriver, user, fetchOrders]);

  const markAsDelivered = async (orderId: string) => {
    const { error } = await (supabase as any)
      .from('customer_orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('driver_id', user.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Pedido marcado como entregue!' });
    fetchOrders();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/conta/login');
  };

  const fmt = (price: number) =>
    Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // --- Filters ---
  const pendingOrders = orders.filter(o => o.status === 'delivering');
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
  const displayOrders = filter === 'pending' ? pendingOrders : deliveredOrders;

  // --- Earnings (delivery_fee only) ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEarnings = orders
    .filter(o => ['delivered', 'completed'].includes(o.status) && new Date(o.delivered_at || o.created_at) >= todayStart)
    .reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  const totalEarnings = orders
    .filter(o => ['delivered', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  // --- Reports helpers ---
  const filterByPeriod = (items: DeliveryOrder[], p: PeriodKey) => {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    return items.filter(o => {
      const d = new Date(o.delivered_at || o.created_at);
      if (p === 'all') return true;
      if (p === 'today') return d.toDateString() === now.toDateString();
      if (p === 'yesterday') return d.toDateString() === yesterday.toDateString();
      if (p === 'week') { const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago; }
      if (p === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const completedAll = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const periodOrders = filterByPeriod(completedAll, period);
  const periodEarnings = periodOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
  const periodDeliveries = periodOrders.length;
  const avgEarning = periodDeliveries > 0 ? periodEarnings / periodDeliveries : 0;

  // Earnings by day chart
  const earningsByDay = (() => {
    const days: Record<string, { earnings: number; count: number }> = {};
    periodOrders.forEach(o => {
      const key = new Date(o.delivered_at || o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[key]) days[key] = { earnings: 0, count: 0 };
      days[key].earnings += (o.delivery_fee || 0);
      days[key].count += 1;
    });
    return Object.entries(days).reverse().slice(0, 14).reverse().map(([day, data]) => ({ day, ...data }));
  })();

  // Neighborhoods ranking
  const neighborhoodData = (() => {
    const map: Record<string, { count: number; earnings: number }> = {};
    periodOrders.forEach(o => {
      const addr = o.address || 'Sem endereço';
      // Extract neighborhood (after last " - ")
      const parts = addr.split(' - ');
      const neighborhood = parts.length > 1 ? parts[parts.length - 1].trim() : addr;
      if (!map[neighborhood]) map[neighborhood] = { count: 0, earnings: 0 };
      map[neighborhood].count += 1;
      map[neighborhood].earnings += (o.delivery_fee || 0);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  })();

  // Recent deliveries table
  const recentDeliveries = periodOrders.slice(0, 20);

  const CustomTooltip = ({ active: a, payload, label }: any) => {
    if (!a || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.value >= 1 ? (p.name === 'Entregas' ? p.value : fmt(p.value)) : p.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              <span className="text-gradient-burger">Painel Entregador</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Earnings Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ganhos hoje</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(todayEarnings)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Baseado no frete das entregas</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ganhos totais</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(totalEarnings)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{deliveredOrders.length} entrega{deliveredOrders.length !== 1 ? 's' : ''} realizada{deliveredOrders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-muted/50 rounded-xl p-1.5">
          <button
            onClick={() => setTab('entregas')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              tab === 'entregas' ? "gradient-burger text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Truck className="w-4 h-4" /> Entregas
          </button>
          <button
            onClick={() => setTab('relatorios')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              tab === 'relatorios' ? "gradient-burger text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Relatórios
          </button>
        </div>

        {/* ============ ENTREGAS TAB ============ */}
        {tab === 'entregas' && (
          <>
            {/* Stats */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                <Package className="w-3 h-3 mr-1" />
                {pendingOrders.length} pendente{pendingOrders.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {deliveredOrders.length} entregue{deliveredOrders.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
                className={filter === 'pending' ? 'gradient-burger text-primary-foreground' : ''}
              >
                <Truck className="w-4 h-4 mr-1" /> Pendentes
              </Button>
              <Button
                variant={filter === 'delivered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('delivered')}
                className={filter === 'delivered' ? 'gradient-burger text-primary-foreground' : ''}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Entregues
              </Button>
            </div>

            {/* Orders List */}
            {displayOrders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {filter === 'pending' ? (
                  <>
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma entrega pendente</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma entrega realizada ainda</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayOrders.map(order => (
                  <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full p-4 text-left"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-foreground text-sm">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            {order.status === 'delivering' ? (
                              <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs">
                                <Truck className="w-3 h-3 mr-1" /> A caminho
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Entregue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span><Clock className="w-3 h-3 inline mr-1" />{formatDate(order.created_at)}</span>
                            <span>{order.item_count} ite{order.item_count !== 1 ? 'ns' : 'm'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-primary text-sm">Frete: {fmt(order.delivery_fee)}</span>
                          {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {order.address && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-foreground">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{order.address}</span>
                        </div>
                      )}
                    </button>

                    {expandedOrder === order.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-3 text-sm">
                          {order.customer_name && (
                            <span className="flex items-center gap-1 text-foreground">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {order.customer_name}
                            </span>
                          )}
                          {order.customer_phone && (
                            <a
                              href={`tel:${order.customer_phone.replace(/\D/g, '')}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {order.customer_phone}
                            </a>
                          )}
                        </div>

                        {order.reference_point && (
                          <p className="text-xs text-muted-foreground">Ref: {order.reference_point}</p>
                        )}

                        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {order.payment_method === 'cartao' ? 'Cartão' : order.payment_method === 'dinheiro' ? 'Dinheiro' : 'PIX'}
                          </span>
                          <span className="text-primary font-semibold">
                            Seu ganho: {fmt(order.delivery_fee)}
                          </span>
                        </div>

                        {order.observation && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{order.observation}</p>
                        )}

                        {order.status === 'delivering' && (
                          <Button
                            className="w-full gradient-burger text-primary-foreground font-bold"
                            onClick={() => markAsDelivered(order.id)}
                          >
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Marcar como Entregue
                          </Button>
                        )}

                        {order.delivered_at && (
                          <p className="text-xs text-emerald-400 text-center">
                            Entregue em {formatDate(order.delivered_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============ RELATÓRIOS TAB ============ */}
        {tab === 'relatorios' && (
          <>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-burger">
                      <DollarSign className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ganhos</p>
                  <p className="text-lg font-bold text-gradient-burger">{fmt(periodEarnings)}</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Entregas</p>
                  <p className="text-lg font-bold text-foreground">{periodDeliveries}</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Média/entrega</p>
                  <p className="text-lg font-bold text-foreground">{avgEarning > 0 ? fmt(avgEarning) : '—'}</p>
                </div>
              </div>
            </div>

            {/* Earnings by Day Chart */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Ganhos por dia</h3>
              {earningsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={earningsByDay}>
                    <defs>
                      <linearGradient id="driverEarningsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} tickFormatter={v => `R$${v}`} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="earnings" name="Ganhos" stroke="hsl(25, 95%, 53%)" strokeWidth={2} fill="url(#driverEarningsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  <CalendarDays className="w-5 h-5 mr-2 opacity-40" /> Sem dados no período
                </div>
              )}
            </div>

            {/* Deliveries per Day Bar Chart */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Entregas por dia</h3>
              {earningsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={earningsByDay} barSize={24}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20,10%,60%)', fontSize: 11 }} allowDecimals={false} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Entregas" radius={[6, 6, 0, 0]}>
                      {earningsByDay.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Sem dados</div>
              )}
            </div>

            {/* Top Neighborhoods */}
            {neighborhoodData.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Bairros mais entregues</h3>
                <div className="space-y-2">
                  {neighborhoodData.map((n, i) => (
                    <div key={n.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{n.name}</p>
                          <p className="text-xs text-muted-foreground">{n.count} entrega{n.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary">{fmt(n.earnings)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Deliveries Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Últimas entregas</h3>
                <span className="text-xs text-muted-foreground">{periodOrders.length} entregas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Bairro</th>
                      <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Frete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-muted-foreground">
                          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhuma entrega no período</p>
                        </td>
                      </tr>
                    ) : (
                      recentDeliveries.map((order, idx) => {
                        const addr = order.address || '';
                        const parts = addr.split(' - ');
                        const neighborhood = parts.length > 1 ? parts[parts.length - 1].trim() : addr || '—';
                        return (
                          <tr key={order.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 && "bg-muted/5")}>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {formatDate(order.delivered_at || order.created_at)}
                            </td>
                            <td className="py-3 px-4 text-foreground text-xs">{neighborhood}</td>
                            <td className="py-3 px-4 text-right font-semibold text-primary">{fmt(order.delivery_fee)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Entregador;
