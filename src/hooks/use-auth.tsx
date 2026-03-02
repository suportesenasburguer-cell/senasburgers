import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (error) {
        console.error('checkAdmin RPC error:', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data);
    } catch (e) {
      console.error('checkAdmin exception:', e);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            if (!mounted) return;
            checkAdmin(u.id).catch(e => console.error('Error checking admin role:', e));
          }, 0);
        } else {
          setIsAdmin(false);
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
          await checkAdmin(u.id);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Fallback: ensure loading resolves even if auth hangs
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

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
      // Manually check admin and set loading false after sign in
      if (data.user) {
        await checkAdmin(data.user.id);
      }
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      return { error: e?.message || 'Erro inesperado' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
