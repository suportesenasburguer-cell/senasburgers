import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface CustomerProfile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface CustomerAuthContextType {
  user: User | null;
  profile: CustomerProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      setProfile(data as CustomerProfile | null);
    } catch (e) {
      console.warn('Failed to fetch profile:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (data: Partial<CustomerProfile>) => {
    if (!user) return { error: 'Usuário não autenticado' };
    const { error } = await (supabase as any)
      .from('profiles')
      .update(data as any)
      .eq('user_id', user.id);
    if (!error) {
      await fetchProfile(user.id);
    }
    return { error: error?.message ?? null };
  };

  useEffect(() => {
    let mounted = true;

    // Listener for ONGOING auth changes - NO await to avoid deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          setTimeout(() => {
            if (!mounted) return;
            fetchProfile(u.id).catch(() => {});
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // INITIAL load (controls loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchProfile(u.id);
        }
      } catch (e) {
        console.error('Customer auth init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { error: error.message };
      }
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      return { error: e?.message || 'Erro inesperado' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone: phone || '' },
        },
      });

      if (error) return { error: error.message };

      if (data.user) {
        try {
          await (supabase as any).from('profiles').upsert({
            user_id: data.user.id,
            full_name: fullName,
            phone: phone || null,
          }, { onConflict: 'user_id' });
        } catch {}
      }

      return { error: null };
    } catch (e: any) {
      return { error: e?.message || 'Erro inesperado' };
    }
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  return (
    <CustomerAuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
};
