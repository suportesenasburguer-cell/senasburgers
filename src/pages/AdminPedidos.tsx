import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { awardLoyaltyPoints } from '@/lib/order-service';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, ChefHat, Truck, CheckCircle2, XCircle, RefreshCw, Printer, Volume2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminSoundSelector, { playSelectedSound } from '@/components/AdminSoundSelector';
import OrderReceiptPreview from '@/components/OrderReceiptPreview';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: string | null;
}

interface Order {
  id: string;
  user_id: string | null;
  total: number;
  delivery_fee: number;
  payment_method: string;
  delivery_type: string;
  address: string | null;
  observation: string | null;
  status: string;
  item_count: number;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  reference_point: string | null;
  items?: OrderItem[];
}

const STATUS_FLOW = ['sent', 'preparing', 'delivering', 'delivered', 'completed'];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sent: { label: 'Recebido', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  preparing: { label: 'Preparando', icon: <ChefHat className="w-4 h-4" />, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  delivering: { label: 'Saiu p/ Entrega', icon: <Truck className="w-4 h-4" />, color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  delivered: { label: 'Entregue', icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  completed: { label: 'Finalizado', icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelado', icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const AdminPedidos = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [orderCount, setOrderCount] = useState(0);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: ordersData } = await (supabase as any)
      .from('customer_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!ordersData) { setLoading(false); return; }

    // Fetch items for all orders
    const orderIds = ordersData.map((o: any) => o.id);
    const { data: itemsData } = await (supabase as any)
      .from('customer_order_items')
      .select('*')
      .in('order_id', orderIds);

    const ordersWithItems = ordersData.map((o: any) => ({
      ...o,
      items: (itemsData || []).filter((i: any) => i.order_id === o.id),
    }));

    setOrders(ordersWithItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin, fetchOrders]);

  // Track order count for sound alerts
  useEffect(() => {
    setOrderCount(orders.length);
  }, [orders.length]);

  // Real-time subscription with sound alert
  useEffect(() => {
    if (!isAdmin) return;

    const channel = (supabase as any)
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_orders' }, () => {
        playSelectedSound();
        toast({ title: '🔔 Novo pedido recebido!' });
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customer_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [isAdmin, fetchOrders]);

  const advanceStatus = async (order: Order) => {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIdx + 1];

    const { error } = await (supabase as any)
      .from('customer_orders')
      .update({ status: nextStatus })
      .eq('id', order.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }

    // Award loyalty points when order is completed
      if (nextStatus === 'completed') {
      if (order.user_id) {
        await awardLoyaltyPoints(order.user_id, order.id, order.item_count);
        toast({ title: 'Pedido finalizado!', description: `+${order.item_count} ponto(s) de fidelidade creditados.` });
      } else {
        toast({ title: 'Pedido finalizado!', description: 'Pedido de visitante concluído.' });
      }
    } else {
      toast({ title: `Status atualizado para: ${STATUS_CONFIG[nextStatus]?.label}` });
    }

    fetchOrders();
  };

  const cancelOrder = async (order: Order) => {
    const { error } = await (supabase as any)
      .from('customer_orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Pedido cancelado' });
    fetchOrders();
  };

  const formatPrice = (price: number) =>
    Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const printOrder = (order: Order) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    const paymentLabels: Record<string, string> = {
      cartao: 'Cartão',
      dinheiro: 'Dinheiro',
      pix: 'PIX',
    };

    const statusLabels: Record<string, string> = {
      sent: 'Recebido',
      preparing: 'Preparando',
      delivering: 'Saiu p/ Entrega',
      delivered: 'Entregue',
      completed: 'Finalizado',
      cancelled: 'Cancelado',
    };

    const subtotal = (order.items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const discount = subtotal + order.delivery_fee - order.total;
    const hasDiscount = discount > 0.01;
    const orderNumber = order.id.slice(0, 8).toUpperCase();

    const fullDate = new Date(order.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const itemsHtml = (order.items || []).map(item =>
      `<div class="item-row">
        <div class="item-line">
          <span><b>${item.quantity}x</b> ${item.product_name}</span>
          <span class="item-price">${formatPrice(item.unit_price * item.quantity)}</span>
        </div>
        ${item.extras ? `<p class="item-extras">+ ${item.extras}</p>` : ''}
        ${item.quantity > 1 ? `<p class="item-extras">(${formatPrice(item.unit_price)} un.)</p>` : ''}
      </div>`
    ).join('');

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:12px;width:100%;max-width:80mm;margin:0 auto;padding:8px;color:#000;line-height:1.5}
.center{text-align:center}
.bold{font-weight:bold}
.divider{border:none;border-top:1px dashed #999;margin:6px 0}
.thick-divider{border:none;border-top:2px solid #000;margin:5px 0}
.header-border{text-align:center;font-weight:bold;font-size:13px;letter-spacing:2px}
.store-name{text-align:center;font-weight:800;font-size:15px;letter-spacing:1px}
.subtitle{text-align:center;font-size:10px;color:#666;margin-top:3px}
.order-number{text-align:center;font-weight:bold;font-size:13px}
.order-date{text-align:center;font-size:11px;color:#555}
.order-status{text-align:center;font-size:10px;margin-top:2px}
.section-title{font-weight:bold;font-size:11px;margin-bottom:3px}
.info-row{display:flex;gap:4px;font-size:11px;padding:1px 0}
.info-label{font-weight:600;color:#444;min-width:65px}
.info-value{color:#111}
.item-row{margin-bottom:5px}
.item-line{display:flex;justify-content:space-between;gap:6px}
.item-price{white-space:nowrap;font-weight:600}
.item-extras{font-size:10px;color:#555;padding-left:14px;margin-top:1px}
.totals-row{display:flex;justify-content:space-between;font-size:12px;padding:1px 0}
.total-final{display:flex;justify-content:space-between;font-weight:800;font-size:14px}
.discount{color:#2d7a2d}
.obs-box{font-size:11px;color:#555;background:#f5f5f5;padding:4px 6px;border-radius:3px;margin-top:2px}
.footer{text-align:center;font-size:10px;color:#999;margin-top:6px}
@media print{body{margin:0;padding:4px}@page{margin:0;size:80mm auto}}
</style></head><body>

<p class="header-border">═══════════════════</p>
<p class="store-name">SENA'S BURGERS</p>
<p class="header-border">═══════════════════</p>
<p class="subtitle">COMANDA DE PEDIDO</p>

<hr class="divider">

<p class="order-number">Pedido #${orderNumber}</p>
<p class="order-date">${fullDate}</p>
<p class="order-status">Status: <b>${statusLabels[order.status] || order.status}</b></p>

<hr class="divider">

${(order.customer_name || order.customer_phone) ? `
<p class="section-title">DADOS DO CLIENTE</p>
${order.customer_name ? `<div class="info-row"><span class="info-label">Nome:</span><span class="info-value">${order.customer_name}</span></div>` : ''}
${order.customer_phone ? `<div class="info-row"><span class="info-label">Telefone:</span><span class="info-value">${order.customer_phone}</span></div>` : ''}
<hr class="divider">
` : ''}

<p class="section-title">ENTREGA / RETIRADA</p>
<div class="info-row"><span class="info-label">Tipo:</span><span class="info-value">${order.delivery_type === 'delivery' ? '🛵 Delivery' : '🏪 Retirada na Loja'}</span></div>
<div class="info-row"><span class="info-label">Pagamento:</span><span class="info-value">${paymentLabels[order.payment_method] || order.payment_method}</span></div>
${order.address ? `<div class="info-row"><span class="info-label">Endereço:</span><span class="info-value">${order.address}</span></div>` : ''}
${order.reference_point ? `<div class="info-row"><span class="info-label">Referência:</span><span class="info-value">${order.reference_point}</span></div>` : ''}

<hr class="divider">

<p class="section-title">ITENS DO PEDIDO</p>
${itemsHtml}

<hr class="divider">

<div class="totals-row"><span>Subtotal (${order.item_count} ${order.item_count === 1 ? 'item' : 'itens'})</span><span>${formatPrice(subtotal)}</span></div>
${order.delivery_fee > 0 ? `<div class="totals-row"><span>Taxa de Entrega</span><span>${formatPrice(order.delivery_fee)}</span></div>` : ''}
${hasDiscount ? `<div class="totals-row discount"><span>Desconto</span><span>-${formatPrice(discount)}</span></div>` : ''}

<hr class="thick-divider">
<div class="total-final"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>
<hr class="thick-divider">

${order.observation ? `
<p class="section-title">OBSERVAÇÕES</p>
<p class="obs-box">${order.observation}</p>
<hr class="divider">
` : ''}

<p class="footer">Obrigado pela preferência!</p>
<p class="footer">Sena's Burgers - Sabor incomparável</p>
<p class="header-border" style="margin-top:4px">═══════════════════</p>

<script>window.onload=()=>{window.print();window.close()}<\/script>
</body></html>`);
    win.document.close();
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              <span className="text-gradient-burger">Pedidos</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSoundSettings(v => !v)}
              className={showSoundSettings ? 'border-primary text-primary' : ''}
            >
              <Volume2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        {showSoundSettings && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <AdminSoundSelector />
          </div>
        )}
        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'active', label: 'Ativos' },
            { key: 'all', label: 'Todos' },
            { key: 'completed', label: 'Finalizados' },
            { key: 'cancelled', label: 'Cancelados' },
          ].map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? 'gradient-burger text-primary-foreground' : ''}
            >
              {f.label}
              {f.key === 'active' && (
                <span className="ml-1.5 bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Orders */}
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.sent;
            const canAdvance = STATUS_FLOW.indexOf(order.status) >= 0 && STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1;
            const nextStatus = canAdvance ? STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] : null;

            return (
              <div key={order.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border', statusConf.color)}>
                        {statusConf.icon} {statusConf.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="text-primary font-bold text-lg">{formatPrice(order.total)}</span>
                </div>

                {/* Items */}
                <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-1">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {item.quantity}x {item.product_name}
                        {item.extras && <span className="text-muted-foreground ml-1">({item.extras})</span>}
                      </span>
                      <span className="text-muted-foreground">{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground">Frete</span>
                      <span className="text-muted-foreground">{formatPrice(order.delivery_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                {(order.customer_name || order.customer_phone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground mb-2 font-medium">
                    {order.customer_name && <span>👤 {order.customer_name}</span>}
                    {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span>📦 {order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                  <span>💳 {order.payment_method}</span>
                  {order.address && <span>📍 {order.address}</span>}
                  {order.reference_point && <span>🏷️ Ref: {order.reference_point}</span>}
                  {order.observation && <span>📝 {order.observation}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <>
                      {canAdvance && nextStatus && (
                        <Button
                          size="sm"
                          className="gradient-burger text-primary-foreground"
                          onClick={() => advanceStatus(order)}
                        >
                          {STATUS_CONFIG[nextStatus]?.icon}
                          <span className="ml-1.5">
                            {nextStatus === 'completed' ? 'Finalizar Pedido' : `Avançar → ${STATUS_CONFIG[nextStatus]?.label}`}
                          </span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelOrder(order)}
                        className="hover:text-destructive hover:border-destructive"
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOrder(order)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printOrder(order)}
                  >
                    <Printer className="w-4 h-4 mr-1" /> Imprimir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum pedido {filter === 'active' ? 'ativo' : 'encontrado'}</p>
          </div>
        )}
      </div>

      <OrderReceiptPreview
        order={previewOrder}
        open={!!previewOrder}
        onOpenChange={(open) => !open && setPreviewOrder(null)}
        onPrint={printOrder}
      />
    </div>
  );
};

export default AdminPedidos;
