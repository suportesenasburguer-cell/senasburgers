import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  categories?: { name: string; slug: string; icon: string } | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('categories')
        .select('*')
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      return data as DbCategory[];
    },
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*, categories(name, slug, icon)')
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      return data as DbProduct[];
    },
  });
};
