import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, CreditCard, Banknote, QrCode, MapPin, Store, Gift, X, User, Phone, Navigation, Ticket, Check } from 'lucide-react';
import { CartItem } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { useCoupons, Coupon } from '@/hooks/use-coupons';
import { cn } from '@/lib/utils';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  onConfirm: (data: CheckoutData) => void;
}

export interface CheckoutData {
  paymentMethod: string;
  deliveryType: 'delivery' | 'pickup';
  address: string;
  deliveryFee: number;
  observation: string;
  appliedRedemptionId?: string;
  discount?: number;
  customerName: string;
  customerPhone: string;
  referencePoint: string;
  couponCode?: string;
  couponId?: string;
}

interface PendingRedemption {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  reward_type: string;
  reward_name: string;
}

const NEIGHBORHOODS = [
  { name: 'Nova Esperança', fee: 5 },
  { name: 'Vale do Sol', fee: 5 },
  { name: 'Santa Júlia', fee: 5 },
  { name: 'Engenho', fee: 5 },
  { name: 'Bosque Brasil', fee: 8 },
  { name: 'Bosque das Colinas', fee: 7 },
  { name: 'Rosas dos Ventos', fee: 6 },
  { name: 'Passagem de Areia', fee: 7 },
  { name: 'Santa Tereza', fee: 6 },
  { name: 'Bela Parnamirim', fee: 8 },
  { name: 'Santos Reis', fee: 6 },
  { name: 'Monte Castelo', fee: 7 },
  { name: 'Vida Nova', fee: 8 },
  { name: 'Cidade Campestre', fee: 10 },
  { name: 'Conjunto Flamboyants', fee: 10 },
  { name: 'Cajupiranga', fee: 7 },
  { name: 'Centro', fee: 7 },
  { name: 'Cohabinal', fee: 6 },
  { name: 'Boa Esperança', fee: 7 },
  { name: 'Jardim Planalto', fee: 8 },
  { name: 'Liberdade', fee: 9 },
  { name: 'Parque de Exposições', fee: 10 },
];

const getDiscountFromType = (rewardType: string): number => {
  switch (rewardType) {
    case 'discount_10': return 0.10;
    case 'discount_20': return 0.20;
    case 'discount_50': return 0.50;
    default: return 0;
  }
};

const CheckoutDialog = ({ open, onOpenChange, items, total, onConfirm }: CheckoutDialogProps) => {
  const { user } = useCustomerAuth();
  const { validateCoupon, markCouponUsed } = useCoupons();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | ''>('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [observation, setObservation] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchPendingRedemptions();
    }
    if (!open) {
      setSelectedRedemptionId(null);
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
    }
  }, [open, user]);

  const fetchPendingRedemptions = async () => {
    if (!user) return;
    try {
      const { data: redemptions } = await (supabase as any)
        .from('reward_redemptions')
        .select('id, reward_id, points_spent, status')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (!redemptions || redemptions.length === 0) {
        setPendingRedemptions([]);
        return;
      }

      const rewardIds = redemptions.map((r: any) => r.reward_id);
      const { data: rewards } = await (supabase as any)
        .from('rewards')
        .select('id, name, reward_type')
        .in('id', rewardIds);

      const enriched: PendingRedemption[] = redemptions.map((r: any) => {
        const reward = rewards?.find((rw: any) => rw.id === r.reward_id);
        return {
          ...r,
          reward_type: reward?.reward_type || 'custom',
          reward_name: reward?.name || 'Recompensa',
        };
      });
      setPendingRedemptions(enriched);
    } catch (e) {
      console.error('Error fetching redemptions:', e);
    }
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const selectedRedemption = pendingRedemptions.find(r => r.id === selectedRedemptionId);

  const selectedNeighborhood = NEIGHBORHOODS.find(n => n.name === neighborhood);
  const neighborhoodFee = selectedNeighborhood?.fee || 0;

  const isFreeDelivery = selectedRedemption?.reward_type === 'free_delivery' || appliedCoupon?.type === 'free_delivery';
  const discountPercent = selectedRedemption ? getDiscountFromType(selectedRedemption.reward_type) : 0;

  const baseDeliveryFee = deliveryType === 'delivery' ? neighborhoodFee : 0;
  const deliveryFee = isFreeDelivery ? 0 : baseDeliveryFee;
  const rewardDiscount = discountPercent > 0 ? total * discountPercent : 0;

  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscount = total * (appliedCoupon.value / 100);
    } else if (appliedCoupon.type === 'fixed') {
      couponDiscount = Math.min(appliedCoupon.value, total);
    }
  }

  const discountAmount = rewardDiscount + couponDiscount;
  const finalTotal = total - discountAmount + deliveryFee;

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    if (!customerPhone.trim()) {
      setCouponError('Preencha o telefone antes de aplicar o cupom');
      return;
    }
    const { coupon, error } = validateCoupon(couponCode, customerPhone);
    if (coupon) {
      setAppliedCoupon(coupon);
      setCouponError('');
    } else {
      setAppliedCoupon(null);
      setCouponError(error);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };
  const fullAddress = deliveryType === 'delivery' ? `${street}, Nº ${houseNumber}${complement ? ', ' + complement : ''} - ${neighborhood}` : '';
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const isValid = paymentMethod && deliveryType && customerName.trim() && phoneDigits.length === 11 && (deliveryType === 'pickup' || (street.trim() && houseNumber.trim() && neighborhood));
  const MINIMUM_ORDER = 25;
  const isBelowMinimum = total < MINIMUM_ORDER;

  const handleConfirm = async () => {
    if (!isValid || isBelowMinimum) return;

    // Mark the redemption as used
    if (selectedRedemptionId) {
      await (supabase as any)
        .from('reward_redemptions')
        .update({ status: 'used' })
        .eq('id', selectedRedemptionId);
    }

    // Mark coupon as used by this phone
    if (appliedCoupon) {
      markCouponUsed(appliedCoupon.id, customerPhone.trim());
    }

    onConfirm({
      paymentMethod,
      deliveryType: deliveryType as 'delivery' | 'pickup',
      address: fullAddress,
      deliveryFee,
      observation: observation.trim(),
      appliedRedemptionId: selectedRedemptionId || undefined,
      discount: discountAmount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      referencePoint: referencePoint.trim(),
      couponCode: appliedCoupon?.code,
      couponId: appliedCoupon?.id,
    });
  };

  const paymentOptions = [
    { value: 'cartao', label: 'Cartão', icon: CreditCard },
    { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { value: 'pix', label: 'PIX', icon: QrCode },
  ];

  const getRewardLabel = (type: string) => {
    switch (type) {
      case 'free_delivery': return '🚚 Frete Grátis';
      case 'discount_10': return '🏷️ 10% de desconto';
      case 'discount_20': return '🏷️ 20% de desconto';
      case 'discount_50': return '🏷️ 50% de desconto';
      case 'free_item': return '🎁 Item Grátis';
      default: return '🎁 Recompensa';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Finalizar Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Customer Info */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Seus Dados
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="Seu nome *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-background border-border"
              />
              <Input
                placeholder="(84) 9 9999-9999"
                value={customerPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  let formatted = digits;
                  if (digits.length > 0) formatted = `(${digits.slice(0, 2)}`;
                  if (digits.length >= 3) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}`;
                  if (digits.length >= 4) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}`;
                  if (digits.length >= 8) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
                  setCustomerPhone(formatted);
                }}
                className="bg-background border-border"
                type="tel"
                maxLength={18}
              />
            </div>
          </div>
          {/* Pending Rewards */}
          {pendingRedemptions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Usar Recompensa
              </Label>
              <div className="space-y-2">
                {pendingRedemptions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRedemptionId(
                      selectedRedemptionId === r.id ? null : r.id
                    )}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 text-left',
                      selectedRedemptionId === r.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.reward_name}</p>
                      <p className="text-xs text-muted-foreground">{getRewardLabel(r.reward_type)}</p>
                    </div>
                    {selectedRedemptionId === r.id && (
                      <X className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Forma de Pagamento
            </Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-3 gap-2">
              {paymentOptions.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`pay-${opt.value}`}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    paymentMethod === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`pay-${opt.value}`} className="sr-only" />
                  <opt.icon className={`w-5 h-5 ${paymentMethod === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${paymentMethod === opt.value ? 'text-primary' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Delivery Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Tipo de Entrega
            </Label>
            <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'delivery' | 'pickup')} className="grid grid-cols-2 gap-3">
              <Label
                htmlFor="delivery-delivery"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  deliveryType === 'delivery'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="delivery" id="delivery-delivery" className="sr-only" />
                <MapPin className={`w-5 h-5 ${deliveryType === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${deliveryType === 'delivery' ? 'text-primary' : 'text-foreground'}`}>
                    Delivery
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isFreeDelivery ? (
                      <span className="text-green-500 font-semibold">Grátis! 🎉</span>
                    ) : neighborhood ? (
                      `Taxa: ${formatPrice(neighborhoodFee)}`
                    ) : (
                      'Selecione o bairro'
                    )}
                  </p>
                </div>
              </Label>
              <Label
                htmlFor="delivery-pickup"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  deliveryType === 'pickup'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="pickup" id="delivery-pickup" className="sr-only" />
                <Store className={`w-5 h-5 ${deliveryType === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${deliveryType === 'pickup' ? 'text-primary' : 'text-foreground'}`}>
                    Retirada
                  </p>
                  <p className="text-xs text-muted-foreground">Sem taxa</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Address (only for delivery) */}
          {deliveryType === 'delivery' && (
            <div className="space-y-3 animate-fade-in">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Endereço de Entrega
              </Label>
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o bairro *" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-[200] max-h-60">
                  {NEIGHBORHOODS.map((n) => (
                    <SelectItem key={n.name} value={n.name}>
                      {n.name} – {formatPrice(n.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Rua *"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="bg-background border-border"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Número *"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="bg-background border-border"
                />
                <Input
                  placeholder="Complemento"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <Input
                placeholder="Ponto de referência (opcional)"
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          )}

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="obs" className="text-sm font-semibold text-foreground">
              Observação <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="obs"
              placeholder="Ex: Sem cebola, troco para R$50..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="resize-none bg-background border-border"
              rows={2}
            />
          </div>

          {/* Coupon Code */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Cupom de Desconto
            </Label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-primary bg-primary/10">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="font-mono font-bold text-foreground text-sm">{appliedCoupon.code}</span>
                  <span className="text-xs text-muted-foreground">
                    {appliedCoupon.type === 'percentage' && `${appliedCoupon.value}% off`}
                    {appliedCoupon.type === 'fixed' && `- ${formatPrice(appliedCoupon.value)}`}
                    {appliedCoupon.type === 'free_delivery' && 'Frete Grátis'}
                  </span>
                </div>
                <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o cupom"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  className="bg-background border-border uppercase font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                />
                <Button variant="outline" onClick={handleApplyCoupon} className="shrink-0">
                  Aplicar
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-destructive">{couponError}</p>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-500 font-medium">
                <span>Desconto recompensa ({Math.round(discountPercent * 100)}%)</span>
                <span>- {formatPrice(rewardDiscount)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-500 font-medium">
                <span>Cupom {appliedCoupon?.code}</span>
                <span>- {formatPrice(couponDiscount)}</span>
              </div>
            )}
            {deliveryType === 'delivery' && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de entrega</span>
                  {isFreeDelivery ? (
                    <span className="text-green-500 font-medium line-through-none">
                      <span className="line-through text-muted-foreground mr-1">{formatPrice(neighborhoodFee)}</span>
                      Grátis
                    </span>
                  ) : (
                    <span>{formatPrice(neighborhoodFee)}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Previsão de entrega</span>
                  <span>~50 min</span>
                </div>
              </>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
              <span>Total</span>
              <span className="text-primary">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Minimum Order Warning */}
          {isBelowMinimum && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-destructive">
                Pedido mínimo de {formatPrice(MINIMUM_ORDER)}
              </p>
              <p className="text-xs text-destructive/80">
                Adicione mais itens ao carrinho (faltam {formatPrice(MINIMUM_ORDER - total)})
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isBelowMinimum}
            className="w-full gradient-burger text-primary-foreground py-6 rounded-xl font-bold text-lg gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar pelo WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CheckoutDialog, type CheckoutDialogProps };
export default CheckoutDialog;
