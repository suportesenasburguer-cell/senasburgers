import { useState, useEffect } from 'react';
import { useCart, Order as LocalOrder } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Package, Calendar, CheckCircle, Clock, ChefHat, Truck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DbOrder {
  id: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  delivery_type: string;
  address: string | null;
  observation: string | null;
  status: string;
  item_count: number;
  created_at: string;
  items: DbOrderItem[];
}

interface DbOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sent: { label: 'Recebido', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500/20 text-yellow-400' },
  preparing: { label: 'Preparando', icon: <ChefHat className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400' },
  delivering: { label: 'Saiu p/ Entrega', icon: <Truck className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Entregue', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400' },
  completed: { label: 'Finalizado', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelado', icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400' },
};

const Pedidos = () => {
  const { orders: localOrders } = useCart();
  const { user, loading: authLoading } = useCustomerAuth();
  const [dbOrders, setDbOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Real-time subscription for logged-in users
  useEffect(() => {
    if (!user) return;

    const channel = (supabase as any)
      .channel('user-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_orders', filter: `user_id=eq.${user.id}` }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ordersData } = await (supabase as any)
      .from('customer_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!ordersData) { setLoading(false); return; }

    const orderIds = ordersData.map((o: any) => o.id);
    const { data: itemsData } = await (supabase as any)
      .from('customer_order_items')
      .select('*')
      .in('order_id', orderIds);

    const ordersWithItems = ordersData.map((o: any) => ({
      ...o,
      items: (itemsData || []).filter((i: any) => i.order_id === o.id),
    }));

    setDbOrders(ordersWithItems);
    setLoading(false);
  };

  const formatPrice = (price: number) =>
    Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isLoading = authLoading || loading;

  // Show DB orders for logged-in users, localStorage orders for guests
  const showDbOrders = !!user;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        <div className="text-center mb-10 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Meus <span className="text-gradient-burger">Pedidos</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Acompanhe todos os pedidos que você realizou
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : showDbOrders ? (
          /* DB Orders for logged-in users */
          dbOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum pedido ainda</h3>
              <p className="text-muted-foreground">Seus pedidos aparecerão aqui após finalizar uma compra.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {dbOrders.map((order, index) => {
                const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.sent;
                return (
                  <div
                    key={order.id}
                    className={cn(
                      'bg-card rounded-2xl border border-border p-6 animate-fade-in',
                      'hover:border-primary/30 transition-all duration-300'
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-burger flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Pedido #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                        statusConf.color
                      )}>
                        {statusConf.icon} {statusConf.label}
                      </div>
                    </div>

                    {/* Status Progress */}
                    {order.status !== 'cancelled' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-1">
                          {['sent', 'preparing', 'delivering', 'delivered', 'completed'].map((step, i) => {
                            const stepIdx = ['sent', 'preparing', 'delivering', 'delivered', 'completed'].indexOf(order.status);
                            const isActive = i <= stepIdx;
                            const stepConf = STATUS_CONFIG[step];
                            return (
                              <div key={step} className="flex-1 flex flex-col items-center gap-1">
                                <div className={cn(
                                  'w-full h-1.5 rounded-full transition-all',
                                  isActive ? 'bg-primary' : 'bg-muted'
                                )} />
                                <span className={cn(
                                  'text-[10px] text-center leading-tight hidden sm:block',
                                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                                )}>
                                  {stepConf?.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-2 mb-4 bg-muted/50 rounded-lg p-3">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="text-sm text-foreground">
                            {item.quantity}x {item.product_name}
                            {item.extras && <span className="text-muted-foreground ml-1">({item.extras})</span>}
                          </span>
                          <span className="text-sm text-muted-foreground font-medium">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                          <span className="text-muted-foreground">Frete</span>
                          <span className="text-muted-foreground">{formatPrice(order.delivery_fee)}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                      <span>📦 {order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                      <span>💳 {order.payment_method}</span>
                      {order.address && <span>📍 {order.address}</span>}
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* LocalStorage orders for guests */
          localOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum pedido ainda</h3>
              <p className="text-muted-foreground">Seus pedidos aparecerão aqui após finalizar uma compra.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {localOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={cn(
                    'bg-card rounded-2xl border border-border p-6 animate-fade-in',
                    'hover:border-primary/30 transition-all duration-300'
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-burger flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          Pedido #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.date)}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                      'bg-green-500/20 text-green-400'
                    )}>
                      <CheckCircle className="w-4 h-4" />
                      Enviado
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-muted/50 rounded-lg p-3">
                    {order.items.map((cartItem) => (
                      <div key={cartItem.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">
                          {cartItem.quantity}x {cartItem.item.name}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">
                          {formatPrice(cartItem.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Pedidos;