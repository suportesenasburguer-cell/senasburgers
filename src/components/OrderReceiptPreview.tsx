import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: string | null;
}

interface Order {
  id: string;
  user_id: string;
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

const PAYMENT_LABELS: Record<string, string> = {
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  pix: 'PIX',
};

const STATUS_LABELS: Record<string, string> = {
  sent: 'Recebido',
  preparing: 'Preparando',
  delivering: 'Saiu p/ Entrega',
  delivered: 'Entregue',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const formatPrice = (price: number) =>
  Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatFullDate = (date: string) =>
  new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

interface OrderReceiptPreviewProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (order: Order) => void;
}

const OrderReceiptPreview = ({ order, open, onOpenChange, onPrint }: OrderReceiptPreviewProps) => {
  if (!order) return null;

  const subtotal = (order.items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = subtotal + order.delivery_fee - order.total;
  const hasDiscount = discount > 0.01;
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Preview da Comanda</span>
            <Button size="sm" onClick={() => onPrint(order)} className="gradient-burger text-primary-foreground gap-1.5">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Receipt visual preview */}
        <div className="mx-4 mb-4 mt-2 bg-white text-black rounded-lg border-2 border-dashed border-muted-foreground/30 p-5 font-mono text-xs leading-relaxed shadow-inner">
          {/* Header */}
          <div className="text-center space-y-0.5 mb-2">
            <p className="text-sm font-bold tracking-wider">═══════════════════</p>
            <p className="text-base font-extrabold tracking-wide">SENA'S BURGERS</p>
            <p className="text-sm font-bold tracking-wider">═══════════════════</p>
            <p className="text-[10px] text-gray-500 mt-1">COMANDA DE PEDIDO</p>
          </div>

          <DashedLine />

          {/* Order info */}
          <div className="space-y-0.5 text-center">
            <p className="font-bold text-sm">Pedido #{orderNumber}</p>
            <p className="text-gray-600">{formatFullDate(order.created_at)}</p>
            <p className="text-[10px] mt-0.5">
              Status: <span className="font-semibold">{STATUS_LABELS[order.status] || order.status}</span>
            </p>
          </div>

          <DashedLine />

          {/* Customer Info */}
          {(order.customer_name || order.customer_phone) && (
            <>
              <p className="font-bold text-[11px] mb-1">DADOS DO CLIENTE</p>
              {order.customer_name && <InfoRow label="Nome" value={order.customer_name} />}
              {order.customer_phone && <InfoRow label="Telefone" value={order.customer_phone} />}
              <DashedLine />
            </>
          )}

          {/* Delivery Info */}
          <p className="font-bold text-[11px] mb-1">ENTREGA / RETIRADA</p>
          <InfoRow label="Tipo" value={order.delivery_type === 'delivery' ? '🛵 Delivery' : '🏪 Retirada na Loja'} />
          <InfoRow label="Pagamento" value={PAYMENT_LABELS[order.payment_method] || order.payment_method} />
          {order.address && <InfoRow label="Endereço" value={order.address} />}
          {order.reference_point && <InfoRow label="Referência" value={order.reference_point} />}

          <DashedLine />

          {/* Items */}
          <p className="font-bold text-[11px] mb-1.5">ITENS DO PEDIDO</p>
          <div className="space-y-1.5">
            {(order.items || []).map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between gap-2">
                  <span className="flex-1">
                    <span className="font-semibold">{item.quantity}x</span> {item.product_name}
                  </span>
                  <span className="whitespace-nowrap font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
                {item.extras && (
                  <p className="text-[10px] text-gray-500 pl-4 mt-0.5">+ {item.extras}</p>
                )}
                {item.quantity > 1 && (
                  <p className="text-[10px] text-gray-400 pl-4">({formatPrice(item.unit_price)} un.)</p>
                )}
              </div>
            ))}
          </div>

          <DashedLine />

          {/* Totals */}
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal ({order.item_count} {order.item_count === 1 ? 'item' : 'itens'})</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Taxa de Entrega</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex justify-between text-green-700">
                <span>Desconto</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
          </div>

          <div className="my-1.5 border-t-2 border-black" />

          <div className="flex justify-between font-extrabold text-sm">
            <span>TOTAL</span>
            <span>{formatPrice(order.total)}</span>
          </div>

          <div className="my-1.5 border-t-2 border-black" />

          {/* Observation */}
          {order.observation && (
            <>
              <p className="font-bold text-[11px] mb-0.5">OBSERVAÇÕES</p>
              <p className="text-gray-600 text-[11px] bg-gray-50 p-1.5 rounded">{order.observation}</p>
              <DashedLine />
            </>
          )}

          {/* Footer */}
          <div className="text-center space-y-0.5 mt-2">
            <p className="text-[10px] text-gray-400">Obrigado pela preferência!</p>
            <p className="text-[10px] text-gray-400">Sena's Burgers - Sabor incomparável</p>
            <p className="text-sm font-bold tracking-wider mt-1">═══════════════════</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DashedLine = () => (
  <div className="my-2 border-t border-dashed border-gray-400" />
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-1.5 text-[11px]">
    <span className="font-semibold text-gray-700 min-w-[70px]">{label}:</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

export default OrderReceiptPreview;
