import { useState, useEffect } from 'react';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  used_by: string[]; // list of phone numbers that used this coupon
}

const STORAGE_KEY = 'burger-acai-coupons';

const loadCoupons = (): Coupon[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // migrate old coupons without used_by
    return parsed.map((c: any) => ({ ...c, used_by: c.used_by || [] }));
  } catch {
    return [];
  }
};

const saveCoupons = (coupons: Coupon[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
};

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);

  useEffect(() => {
    saveCoupons(coupons);
  }, [coupons]);

  const addCoupon = (coupon: Omit<Coupon, 'id' | 'created_at' | 'used_by'>) => {
    const newCoupon: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase().trim(),
      id: `coupon-${Date.now()}`,
      created_at: new Date().toISOString(),
      used_by: [],
    };
    setCoupons(prev => [...prev, newCoupon]);
  };

  const updateCoupon = (id: string, data: Partial<Omit<Coupon, 'id' | 'created_at'>>) => {
    setCoupons(prev =>
      prev.map(c => (c.id === id ? { ...c, ...data, code: data.code ? data.code.toUpperCase().trim() : c.code } : c))
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  /** Validate coupon. Pass customerPhone to check reuse. */
  const validateCoupon = (code: string, customerPhone?: string): { coupon: Coupon | null; error: string } => {
    const coupon = coupons.find(
      c => c.code === code.toUpperCase().trim() && c.is_active
    );
    if (!coupon) return { coupon: null, error: 'Cupom inválido ou inexistente' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { coupon: null, error: 'Cupom expirado' };
    }
    if (customerPhone) {
      const normalizedPhone = customerPhone.replace(/\D/g, '');
      if (coupon.used_by.some(p => p.replace(/\D/g, '') === normalizedPhone)) {
        return { coupon: null, error: 'Você já utilizou este cupom' };
      }
    }
    return { coupon, error: '' };
  };

  /** Mark a coupon as used by a phone number */
  const markCouponUsed = (couponId: string, customerPhone: string) => {
    setCoupons(prev =>
      prev.map(c =>
        c.id === couponId
          ? { ...c, used_by: [...c.used_by, customerPhone.replace(/\D/g, '')] }
          : c
      )
    );
  };

  return { coupons, addCoupon, updateCoupon, deleteCoupon, validateCoupon, markCouponUsed };
};
