import React from 'react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: string | null;
}

interface Order {
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
  customer_name: string | null;
  customer_phone: string | null;
  reference_point: string | null;
  discount: number | null;
  coupon_code: string | null;
  items?: OrderItem[];
}

export const RECEIPT_FONTS = [
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Arial', value: "Arial, Helvetica, sans-serif" },
  { label: 'Verdana', value: "Verdana, Geneva, sans-serif" },
  { label: 'Tahoma', value: "Tahoma, Geneva, sans-serif" },
  { label: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" },
  { label: 'Consolas', value: "Consolas, 'Liberation Mono', monospace" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
];

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

interface OrderReceiptProps {
  order: Order;
  fontFamily?: string;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, fontFamily }) => {
  const font = fontFamily || localStorage.getItem('receipt-font') || RECEIPT_FONTS[0].value;
  const subtotal = (order.items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const fullDate = new Date(order.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      style={{
        fontFamily: font,
        fontSize: 12,
        width: '100%',
        maxWidth: '80mm',
        margin: '0 auto',
        padding: 4,
        color: '#000',
        lineHeight: 1.4,
        background: '#fff',
      }}
    >
      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>COMANDA</p>
      <p style={{ textAlign: 'center', fontSize: 11 }}>#{order.id.slice(0, 8).toUpperCase()}</p>
      <p style={{ textAlign: 'center', fontSize: 10 }}>{fullDate}</p>
      <p style={{ textAlign: 'center', fontSize: 10 }}>Status: {STATUS_LABELS[order.status] || order.status}</p>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {(order.items || []).map((item, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td style={{ padding: '1px 0', verticalAlign: 'top' }}>
                  {item.quantity}x {item.product_name}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '1px 0' }}>
                  {formatPrice(item.unit_price * item.quantity)}
                </td>
              </tr>
              {item.extras && item.extras.split(', ').map((extra, eidx) => {
                const priceMatch = extra.match(/@(\d+\.\d+)$/);
                const extraLabel = extra.replace(/@\d+\.\d+$/, '').trim();
                const extraPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
                return (
                  <tr key={eidx}>
                    <td style={{ padding: '0 0 1px 12px', fontSize: 11, color: '#000' }}>
                      + {extraLabel}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 11, color: '#000', whiteSpace: 'nowrap' }}>
                      {extraPrice ? formatPrice(extraPrice) : ''}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '1px 0' }}>Subtotal</td>
            <td style={{ textAlign: 'right', padding: '1px 0' }}>{formatPrice(subtotal)}</td>
          </tr>
          {order.delivery_fee > 0 && (
            <tr>
              <td style={{ padding: '1px 0' }}>Taxa entrega</td>
              <td style={{ textAlign: 'right', padding: '1px 0' }}>{formatPrice(order.delivery_fee)}</td>
            </tr>
          )}
          {order.discount && order.discount > 0 ? (
            <tr>
              <td style={{ padding: '1px 0' }}>
                Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}
              </td>
              <td style={{ textAlign: 'right', padding: '1px 0', color: '#d00' }}>
                -{formatPrice(order.discount)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 14, fontWeight: 'bold', paddingTop: 4 }}>TOTAL</td>
            <td style={{ fontSize: 14, fontWeight: 'bold', paddingTop: 4, textAlign: 'right' }}>
              {formatPrice(order.total)}
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />

      {order.customer_name && (
        <p style={{ fontSize: 11, padding: '1px 0' }}><b>Cliente:</b> {order.customer_name}</p>
      )}
      {order.customer_phone && (
        <p style={{ fontSize: 11, padding: '1px 0' }}><b>Telefone:</b> {order.customer_phone}</p>
      )}
      <p style={{ fontSize: 11, padding: '1px 0' }}>
        <b>Pagamento:</b> {PAYMENT_LABELS[order.payment_method] || order.payment_method}
      </p>
      <p style={{ fontSize: 11, padding: '1px 0' }}>
        <b>Entrega:</b> {order.delivery_type === 'delivery' ? 'Delivery' : 'Retirada na loja'}
      </p>
      {order.address && (
        <p style={{ fontSize: 11, padding: '1px 0' }}><b>Endereço:</b> {order.address}</p>
      )}
      {order.reference_point && (
        <p style={{ fontSize: 11, padding: '1px 0' }}><b>Ref:</b> {order.reference_point}</p>
      )}
      {order.observation && (
        <p style={{ fontSize: 11, padding: '1px 0' }}><b>Obs:</b> {order.observation}</p>
      )}
      <p style={{ fontSize: 11, padding: '1px 0' }}><b>Itens:</b> {order.item_count}</p>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />
      <p style={{ textAlign: 'center', fontSize: 10, marginTop: 2 }}>Sena's Burgers</p>
    </div>
  );
};

export default OrderReceipt;

/** Generate print HTML using the same layout */
export const getReceiptHTML = (order: Order): string => {
  const font = localStorage.getItem('receipt-font') || RECEIPT_FONTS[0].value;
  const subtotal = (order.items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const fullDate = new Date(order.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = (order.items || []).map(item => {
    const mainRow = `<tr><td>${item.quantity}x ${item.product_name}</td><td style="text-align:right;white-space:nowrap">${formatPrice(item.unit_price * item.quantity)}</td></tr>`;
    const extrasRows = item.extras ? item.extras.split(', ').map(extra => {
      const priceMatch = extra.match(/@(\d+\.\d+)$/);
      const extraLabel = extra.replace(/@\d+\.\d+$/, '').trim();
      const extraPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
      return `<tr><td style="padding:0 0 1px 12px;font-size:11px;color:#000">+ ${extraLabel}</td><td style="text-align:right;font-size:11px;color:#000;white-space:nowrap">${extraPrice ? formatPrice(extraPrice) : ''}</td></tr>`;
    }).join('') : '';
    return mainRow + extrasRows;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};font-size:12px;width:100%;max-width:80mm;margin:0 auto;padding:4px;color:#000;line-height:1.4}
.center{text-align:center}
.bold{font-weight:bold}
.divider{border:none;border-top:1px dashed #000;margin:4px 0}
table{width:100%;border-collapse:collapse}
td{padding:1px 0;vertical-align:top}
.total-row td{font-size:14px;font-weight:bold;padding-top:4px}
.info-row{font-size:11px;padding:1px 0}
@media print{body{margin:0;padding:2px}@page{margin:0;size:80mm auto}}
</style></head><body>
<p class="center bold" style="font-size:14px">COMANDA</p>
<p class="center" style="font-size:11px">#${order.id.slice(0, 8).toUpperCase()}</p>
<p class="center" style="font-size:10px">${fullDate}</p>
<p class="center" style="font-size:10px">Status: ${STATUS_LABELS[order.status] || order.status}</p>
<hr class="divider">
<table>${itemsHtml}</table>
<hr class="divider">
<table>
<tr><td>Subtotal</td><td style="text-align:right">${formatPrice(subtotal)}</td></tr>
${order.delivery_fee > 0 ? `<tr><td>Taxa entrega</td><td style="text-align:right">${formatPrice(order.delivery_fee)}</td></tr>` : ''}
${(order.discount && order.discount > 0) ? `<tr><td>Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}</td><td style="text-align:right;color:#d00">-${formatPrice(order.discount)}</td></tr>` : ''}
</table>
<hr class="divider">
<table><tr class="total-row"><td>TOTAL</td><td style="text-align:right">${formatPrice(order.total)}</td></tr></table>
<hr class="divider">
${order.customer_name ? `<p class="info-row"><b>Cliente:</b> ${order.customer_name}</p>` : ''}
${order.customer_phone ? `<p class="info-row"><b>Telefone:</b> ${order.customer_phone}</p>` : ''}
<p class="info-row"><b>Pagamento:</b> ${PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
<p class="info-row"><b>Entrega:</b> ${order.delivery_type === 'delivery' ? 'Delivery' : 'Retirada na loja'}</p>
${order.address ? `<p class="info-row"><b>Endereço:</b> ${order.address}</p>` : ''}
${order.reference_point ? `<p class="info-row"><b>Ref:</b> ${order.reference_point}</p>` : ''}
${order.observation ? `<p class="info-row"><b>Obs:</b> ${order.observation}</p>` : ''}
<p class="info-row"><b>Itens:</b> ${order.item_count}</p>
<hr class="divider">
<p class="center" style="font-size:10px;margin-top:2px">Sena's Burgers</p>
<script>window.onload=()=>{window.print();window.close()}<\/script>
</body></html>`;
};
