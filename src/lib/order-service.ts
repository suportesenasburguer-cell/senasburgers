import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/contexts/CartContext';

interface SaveOrderParams {
  userId: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  paymentMethod: string;
  deliveryType: string;
  address: string;
  observation: string;
  customerName?: string;
  customerPhone?: string;
}

export const saveCustomerOrder = async (params: SaveOrderParams) => {
  const { userId, items, total, deliveryFee, paymentMethod, deliveryType, address, observation } = params;
  
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  // Insert order
  const { data: order, error: orderError } = await (supabase as any)
    .from('customer_orders')
    .insert({
      user_id: userId,
      total: total + deliveryFee,
      delivery_fee: deliveryFee,
      payment_method: paymentMethod,
      delivery_type: deliveryType,
      address: address || null,
      observation: observation || null,
      status: 'sent',
      item_count: totalItems,
    })
    .select('id')
    .single();

  if (orderError) {
    console.error('Error saving order:', orderError);
    return null;
  }

  // Insert order items
  const orderItems = items.map(ci => ({
    order_id: order.id,
    product_name: ci.item.name,
    quantity: ci.quantity,
    unit_price: ci.item.price,
    extras: [
      ci.addBatata ? 'Batata' : null,
      ci.bebida?.name || null,
    ].filter(Boolean).join(', ') || null,
  }));

  await (supabase as any).from('customer_order_items').insert(orderItems);

  return { orderId: order.id, totalItems };
};

export const awardLoyaltyPoints = async (userId: string, orderId: string, totalItems: number) => {
  await (supabase as any).from('loyalty_points').insert({
    user_id: userId,
    order_id: orderId,
    points: totalItems,
    description: `+${totalItems} ponto${totalItems > 1 ? 's' : ''} - Pedido`,
  });
};
