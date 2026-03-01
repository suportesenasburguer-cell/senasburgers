import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  used_by: string[];
}

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coupons:', error);
        return;
      }
      setCoupons((data || []).map((c: any) => ({ ...c, used_by: c.used_by || [] })));
    } catch (e) {
      console.error('Failed to fetch coupons:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'created_at' | 'used_by'>) => {
    const { data, error } = await (supabase as any)
      .from('coupons')
      .insert({
        code: coupon.code.toUpperCase().trim(),
        type: coupon.type,
        value: coupon.value,
        is_active: coupon.is_active,
        expires_at: coupon.expires_at || null,
        used_by: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding coupon:', error);
      return;
    }
    if (data) {
      setCoupons(prev => [{ ...data, used_by: data.used_by || [] }, ...prev]);
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Omit<Coupon, 'id' | 'created_at'>>) => {
    const updateData: any = { ...updates };
    if (updateData.code) updateData.code = updateData.code.toUpperCase().trim();

    const { error } = await (supabase as any)
      .from('coupons')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating coupon:', error);
      return;
    }
    setCoupons(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updateData } : c))
    );
  };

  const deleteCoupon = async (id: string) => {
    const { error } = await (supabase as any)
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting coupon:', error);
      return;
    }
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

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

  const markCouponUsed = async (couponId: string, customerPhone: string) => {
    const coupon = coupons.find(c => c.id === couponId);
    if (!coupon) return;

    const newUsedBy = [...coupon.used_by, customerPhone.replace(/\D/g, '')];

    const { error } = await (supabase as any)
      .from('coupons')
      .update({ used_by: newUsedBy })
      .eq('id', couponId);

    if (error) {
      console.error('Error marking coupon used:', error);
      return;
    }
    setCoupons(prev =>
      prev.map(c => (c.id === couponId ? { ...c, used_by: newUsedBy } : c))
    );
  };

  return { coupons, loading, addCoupon, updateCoupon, deleteCoupon, validateCoupon, markCouponUsed, refetch: fetchCoupons };
};
