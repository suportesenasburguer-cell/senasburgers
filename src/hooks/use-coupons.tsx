import { useState, useEffect } from 'react';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number; // percentage (0-100) or fixed amount in BRL; ignored for free_delivery
  is_active: boolean;
  expires_at: string | null; // ISO date string or null
  created_at: string;
}

const STORAGE_KEY = 'burger-acai-coupons';

const loadCoupons = (): Coupon[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

  const addCoupon = (coupon: Omit<Coupon, 'id' | 'created_at'>) => {
    const newCoupon: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase().trim(),
      id: `coupon-${Date.now()}`,
      created_at: new Date().toISOString(),
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

  const validateCoupon = (code: string): Coupon | null => {
    const coupon = coupons.find(
      c => c.code === code.toUpperCase().trim() && c.is_active
    );
    if (!coupon) return null;
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
    return coupon;
  };

  return { coupons, addCoupon, updateCoupon, deleteCoupon, validateCoupon };
};
