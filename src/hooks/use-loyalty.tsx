import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from './use-customer-auth';

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  image_url: string | null;
}

interface Redemption {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward?: Reward;
}

export const useLoyalty = () => {
  const { user } = useCustomerAuth();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('loyalty_points')
        .select('points')
        .eq('user_id', user.id);
      const total = (data || []).reduce((sum: number, r: any) => sum + r.points, 0);
      setPoints(total);
    } catch { }
  }, [user]);

  const fetchRewards = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required');
      setRewards(data || []);
    } catch { }
  }, []);

  const fetchRedemptions = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('reward_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRedemptions(data || []);
    } catch { }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPoints(), fetchRewards(), fetchRedemptions()]);
      setLoading(false);
    };
    load();
  }, [user, fetchPoints, fetchRewards, fetchRedemptions]);

  const redeemReward = async (reward: Reward) => {
    if (!user || points < reward.points_required) return { error: 'Pontos insuficientes' };

    // Debit points
    const { error: pointsError } = await (supabase as any)
      .from('loyalty_points')
      .insert({
        user_id: user.id,
        points: -reward.points_required,
        description: `Resgate: ${reward.name}`,
      });

    if (pointsError) return { error: pointsError.message };

    // Create redemption record
    const { error: redeemError } = await (supabase as any)
      .from('reward_redemptions')
      .insert({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.points_required,
        status: 'pending',
      });

    if (redeemError) return { error: redeemError.message };

    await Promise.all([fetchPoints(), fetchRedemptions()]);
    return { error: null };
  };

  return { points, rewards, redemptions, loading, redeemReward, refresh: fetchPoints };
};
