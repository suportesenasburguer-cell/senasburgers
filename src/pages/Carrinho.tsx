import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import CheckoutDialog, { CheckoutData } from '@/components/CheckoutDialog';
import { saveCustomerOrder } from '@/lib/order-service';

const Carrinho = () => {
  const { items, removeItem, updateQuantity, clearCart, getTotal, addOrder } = useCart();
  const { user, profile } = useCustomerAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const generateOrderNumber = () => {
    return Math.floor(10000 + Math.random() * 90000);
  };

  const generateWhatsAppMessage = (data: CheckoutData, orderNumber: number) => {
    const paymentLabel: Record<string, string> = {
      cartao: '💳 Cartão',
      dinheiro: '💵 Dinheiro',
      pix: '📱 PIX',
    };

    const discount = data.discount || 0;
    const finalTotal = getTotal() - discount + data.deliveryFee;
    const couponInfo = data.couponCode ? `\n🏷️ Cupom: ${data.couponCode} (-${formatPrice(discount)})` : '';

    let message = `Pedido nº ${orderNumber}\n\n👤 *${data.customerName}*\n📞 ${data.customerPhone}\n\nItens:\n`;

    items.forEach((cartItem) => {
      let itemLine = `\n➡ ${cartItem.quantity}x ${cartItem.item.name}`;
      if (cartItem.addBatata || cartItem.bebida) {
        const extras = [
          cartItem.addBatata && '🍟 Batata',
          cartItem.bebida && `🥤 ${cartItem.bebida.name}`,
        ].filter(Boolean).join(', ');
        itemLine += ` (${extras})`;
      }
      if (cartItem.addons && cartItem.addons.length > 0) {
        const addonList = cartItem.addons.map(a => `${a.quantity}x ${a.name}`).join(', ');
        itemLine += `\n   ➕ Adicionais: ${addonList}`;
      }
      message += itemLine;
    });

    message += `\n\n${paymentLabel[data.paymentMethod] || data.paymentMethod}`;
    message += couponInfo;

    if (data.deliveryType === 'delivery') {
      message += `\n\n🛵 Delivery (taxa de: ${formatPrice(data.deliveryFee)})`;
      message += `\n\n🏠 ${data.address}`;
      if (data.referencePoint) {
        message += `\n📍 Ref: ${data.referencePoint}`;
      }
      message += `\n\n(Estimativa: 50 minutos)`;
    } else {
      message += `\n\n🏪 Retirada na loja`;
    }

    if (data.observation) {
      message += `\n\n📝 *Obs:* ${data.observation}`;
    }

    message += `\n\nTotal: ${formatPrice(finalTotal)}`;
    message += `\n\nObrigado pela preferência, se precisar de algo é só chamar! 😉`;

    return encodeURIComponent(message);
  };

  const handleCheckoutConfirm = async (data: CheckoutData) => {
    if (items.length === 0) return;

    const orderNumber = generateOrderNumber();

    // Save order to local history
    const order = {
      id: `order-${Date.now()}`,
      items: [...items],
      total: getTotal() - (data.discount || 0) + data.deliveryFee,
      date: new Date().toISOString(),
      status: 'sent' as const,
    };
    addOrder(order);

    // Save to DB (logged in or guest)
    await saveCustomerOrder({
      userId: user?.id || null,
      items,
      total: getTotal(),
      deliveryFee: data.deliveryFee,
      paymentMethod: data.paymentMethod,
      deliveryType: data.deliveryType,
      address: data.address,
      observation: data.observation,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      referencePoint: data.referencePoint,
      discount: data.discount,
      couponCode: data.couponCode,
    });

    // Open WhatsApp
    const phoneNumber = '5584988760462';
    const message = generateWhatsAppMessage(data, orderNumber);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');

    // Clear cart and close dialog
    clearCart();
    setCheckoutOpen(false);

    toast({
      title: 'Pedido enviado!',
      description: `Pedido nº ${orderNumber} enviado para o WhatsApp.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        {/* Header */}
        <div className="text-center mb-10 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Seu <span className="text-gradient-burger">Pedido</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Revise seus itens e finalize pelo WhatsApp
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Carrinho vazio
            </h3>
            <p className="text-muted-foreground mb-6">
              Adicione itens do cardápio para fazer seu pedido.
            </p>
            <Link
              to="/"
              className="inline-block gradient-burger text-primary-foreground px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
            >
              Ver Cardápio
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Cart Items */}
            <div className="space-y-4 mb-8">
              {items.map((cartItem, index) => (
                <div
                  key={cartItem.id}
                  className={cn(
                    'bg-card rounded-2xl border border-border p-4 animate-fade-in',
                    'hover:border-primary/30 transition-all duration-300'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    <img
                      src={cartItem.item.image}
                      alt={cartItem.item.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {cartItem.item.name}
                          </h3>
                          {(cartItem.addBatata || cartItem.bebida) && (
                            <p className="text-sm text-muted-foreground">
                              + {[
                                cartItem.addBatata && 'Batata',
                                cartItem.bebida?.name,
                              ].filter(Boolean).join(' + ')}
                            </p>
                          )}
                          {cartItem.addons && cartItem.addons.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              + {cartItem.addons.map(a => `${a.quantity}x ${a.name}`).join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(cartItem.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-foreground">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-primary">
                          {formatPrice(cartItem.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-foreground">Subtotal</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(getTotal())}
                </span>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full flex items-center justify-center gap-3 gradient-burger text-primary-foreground py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Finalizar Pedido
              </button>

              <button
                onClick={clearCart}
                className="w-full mt-3 py-3 text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar carrinho
              </button>
            </div>
          </div>
        )}
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={items}
        total={getTotal()}
        onConfirm={handleCheckoutConfirm}
      />
    </div>
  );
};

export default Carrinho;
