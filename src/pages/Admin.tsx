import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Edit2, Save, X, Image as ImageIcon,
  Package, Upload, Star, StarOff, Gift, Tag, Layers, PauseCircle, PlayCircle,
  GripVertical, Ticket
} from 'lucide-react';
import { useCoupons, Coupon } from '@/hooks/use-coupons';
import CouponsTab from '@/components/CouponsTab';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

interface Product {
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
}

interface ProductSize {
  id: string;
  product_id: string;
  label: string;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface Upsell {
  id: string;
  product_id: string;
  upsell_product_id: string;
  extra_price: number;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  original_price: number;
  promo_price: number;
  image_url: string | null;
  valid_until: string;
  items: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  category_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const REWARD_TYPES = [
  { value: 'free_delivery', label: 'Frete Grátis' },
  { value: 'free_item', label: 'Item Grátis' },
  { value: 'discount_10', label: 'Desconto 10%' },
  { value: 'discount_20', label: 'Desconto 20%' },
  { value: 'discount_50', label: 'Desconto 50%' },
  { value: 'custom', label: 'Personalizado' },
];

const Admin = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'upsells' | 'promotions' | 'addons' | 'rewards' | 'coupons'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', category_id: '', is_popular: false, image_url: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Product sizes
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [sizeForm, setSizeForm] = useState({ label: '', price: '' });

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', icon: 'utensils' });

  // Upsell form
  const [showUpsellForm, setShowUpsellForm] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<Upsell | null>(null);
  const [upsellForm, setUpsellForm] = useState({
    product_id: '', upsell_product_id: '', extra_price: '', label: ''
  });
  const [upsellCategoryFilter, setUpsellCategoryFilter] = useState<string>('all');
  const [upsellApplyToCategory, setUpsellApplyToCategory] = useState(false);

  // Addon form
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [addonForm, setAddonForm] = useState({ name: '', price: '', category_id: '' });
  const [addonCategoryFilter, setAddonCategoryFilter] = useState<string>('all');

  // Reward form
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '', description: '', points_required: '', reward_type: 'free_delivery', is_active: true
  });

  // Promotion form
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState({
    title: '', description: '', original_price: '', promo_price: '', valid_until: 'Hoje', items: '', image_url: '', is_active: true
  });
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, prodRes, upsellRes, promoRes, addonRes, rewardRes] = await Promise.all([
      (supabase as any).from('categories').select('*').order('sort_order').order('created_at'),
      (supabase as any).from('products').select('*').order('sort_order').order('created_at'),
      (supabase as any).from('product_upsells').select('*').order('sort_order').order('created_at'),
      (supabase as any).from('promotions').select('*').order('sort_order').order('created_at'),
      (supabase as any).from('product_addons').select('*').order('sort_order').order('created_at'),
      (supabase as any).from('rewards').select('*').order('sort_order').order('created_at'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (upsellRes.data) setUpsells(upsellRes.data);
    if (promoRes.data) setPromotions(promoRes.data as unknown as Promotion[]);
    if (addonRes.data) setAddons(addonRes.data as unknown as Addon[]);
    if (rewardRes.data) setRewards(rewardRes.data as unknown as Reward[]);
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) {
      toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // Product CRUD
  const handleProductSubmit = async () => {
    try {
      console.log('handleProductSubmit called', productForm);
      
      if (!productForm.name || !productForm.price || !productForm.category_id) {
        toast({ title: 'Preencha nome, preço e categoria', variant: 'destructive' });
        console.log('Validation failed:', { name: productForm.name, price: productForm.price, category_id: productForm.category_id });
        return;
      }

      let imageUrl = productForm.image_url;
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (url) imageUrl = url;
      }

      const payload = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category_id: productForm.category_id,
        is_popular: productForm.is_popular,
        image_url: imageUrl || null,
      };

      console.log('Product payload:', payload);

      if (editingProduct) {
        const { error } = await (supabase as any).from('products').update(payload).eq('id', editingProduct.id);
        if (error) { console.error('Product update error:', error); toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Produto atualizado!' });
      } else {
        const { data, error } = await (supabase as any).from('products').insert(payload).select();
        console.log('Product insert result:', { data, error });
        if (error) { 
          console.error('Product insert error:', error); 
          toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' }); 
          return; 
        }
        if (!data || data.length === 0) {
          console.error('Product insert returned no data - possible RLS issue');
          toast({ title: 'Erro ao criar produto', description: 'Sem permissão. Verifique se você está logado como admin.', variant: 'destructive' });
          return;
        }
        toast({ title: 'Produto criado!' });
      }

      resetProductForm();
      fetchData();
    } catch (err) {
      console.error('handleProductSubmit unexpected error:', err);
      toast({ title: 'Erro inesperado', description: String(err), variant: 'destructive' });
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await (supabase as any).from('products').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Produto removido!' });
    fetchData();
  };

  const editProduct = async (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      category_id: p.category_id,
      is_popular: p.is_popular,
      image_url: p.image_url || '',
    });
    setShowProductForm(true);
    // Fetch sizes for this product
    const { data } = await (supabase as any)
      .from('product_sizes')
      .select('*')
      .eq('product_id', p.id)
      .order('sort_order')
      .order('created_at');
    setProductSizes(data || []);
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', category_id: '', is_popular: false, image_url: '' });
    setEditingProduct(null);
    setImageFile(null);
    setShowProductForm(false);
    setProductSizes([]);
    setSizeForm({ label: '', price: '' });
  };

  const handleAddSize = async () => {
    if (!editingProduct || !sizeForm.label || !sizeForm.price) {
      toast({ title: 'Salve o produto primeiro e preencha label e preço do tamanho', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('product_sizes').insert({
      product_id: editingProduct.id,
      label: sizeForm.label,
      price: parseFloat(sizeForm.price),
      sort_order: productSizes.length,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tamanho adicionado!' });
    setSizeForm({ label: '', price: '' });
    const { data } = await (supabase as any).from('product_sizes').select('*').eq('product_id', editingProduct.id).order('sort_order').order('created_at');
    setProductSizes(data || []);
  };

  const handleDeleteSize = async (sizeId: string) => {
    const { error } = await (supabase as any).from('product_sizes').delete().eq('id', sizeId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tamanho removido!' });
    setProductSizes(prev => prev.filter(s => s.id !== sizeId));
  };

  // Category CRUD
  const handleCategorySubmit = async () => {
    console.log('handleCategorySubmit called', categoryForm);
    if (!categoryForm.name || !categoryForm.slug) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const payload = { name: categoryForm.name, slug: categoryForm.slug, icon: categoryForm.icon };

    if (editingCategory) {
      const { error } = await (supabase as any).from('categories').update(payload).eq('id', editingCategory.id);
      if (error) { console.error('Category update error:', error); toast({ title: 'Erro ao atualizar categoria', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Categoria atualizada!' });
    } else {
      const { data, error } = await (supabase as any).from('categories').insert(payload).select();
      console.log('Category insert result:', { data, error });
      if (error) { toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Categoria criada!' });
    }

    resetCategoryForm();
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await (supabase as any).from('categories').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Categoria removida!' });
    fetchData();
  };

  const editCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, slug: c.slug, icon: c.icon });
    setShowCategoryForm(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', slug: '', icon: 'utensils' });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // Upsell CRUD
  const handleUpsellSubmit = async () => {
    if (!upsellForm.upsell_product_id || !upsellForm.extra_price || !upsellForm.label) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (upsellApplyToCategory && upsellCategoryFilter !== 'all' && !editingUpsell) {
      // Bulk create for all products in the selected category
      const categoryProducts = products.filter(p => p.category_id === upsellCategoryFilter && p.id !== upsellForm.upsell_product_id);
      
      if (categoryProducts.length === 0) {
        toast({ title: 'Nenhum produto nessa categoria', variant: 'destructive' });
        return;
      }

      const payloads = categoryProducts.map(p => ({
        product_id: p.id,
        upsell_product_id: upsellForm.upsell_product_id,
        extra_price: parseFloat(upsellForm.extra_price),
        label: upsellForm.label,
      }));

      const { error } = await (supabase as any).from('product_upsells').insert(payloads);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: `Oferta criada para ${categoryProducts.length} produtos!` });
    } else {
      if (!upsellForm.product_id && !upsellApplyToCategory) {
        toast({ title: 'Selecione um produto principal', variant: 'destructive' });
        return;
      }

      const payload = {
        product_id: upsellForm.product_id,
        upsell_product_id: upsellForm.upsell_product_id,
        extra_price: parseFloat(upsellForm.extra_price),
        label: upsellForm.label,
      };

      if (editingUpsell) {
        const { error } = await (supabase as any).from('product_upsells').update(payload).eq('id', editingUpsell.id);
        if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Oferta atualizada!' });
      } else {
        const { error } = await (supabase as any).from('product_upsells').insert(payload);
        if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Oferta criada!' });
      }
    }

    resetUpsellForm();
    fetchData();
  };

  const deleteUpsell = async (id: string) => {
    const { error } = await (supabase as any).from('product_upsells').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Oferta removida!' });
    fetchData();
  };

  const editUpsell = (u: Upsell) => {
    setEditingUpsell(u);
    setUpsellApplyToCategory(false);
    setUpsellForm({
      product_id: u.product_id,
      upsell_product_id: u.upsell_product_id,
      extra_price: String(u.extra_price),
      label: u.label,
    });
    setShowUpsellForm(true);
  };

  const resetUpsellForm = () => {
    setUpsellForm({ product_id: '', upsell_product_id: '', extra_price: '', label: '' });
    setEditingUpsell(null);
    setUpsellApplyToCategory(false);
    setShowUpsellForm(false);
  };

  // Addon CRUD
  const handleAddonSubmit = async () => {
    if (!addonForm.name || !addonForm.price || !addonForm.category_id) {
      toast({ title: 'Preencha nome, preço e categoria', variant: 'destructive' });
      return;
    }

    const payload = {
      name: addonForm.name,
      price: parseFloat(addonForm.price),
      category_id: addonForm.category_id,
    };

    if (editingAddon) {
      const { error } = await (supabase as any).from('product_addons').update(payload).eq('id', editingAddon.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Adicional atualizado!' });
    } else {
      const { error } = await (supabase as any).from('product_addons').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Adicional criado!' });
    }

    resetAddonForm();
    fetchData();
  };

  const deleteAddon = async (id: string) => {
    const { error } = await (supabase as any).from('product_addons').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Adicional removido!' });
    fetchData();
  };

  const editAddon = (a: Addon) => {
    setEditingAddon(a);
    setAddonForm({
      name: a.name,
      price: String(a.price),
      category_id: a.category_id,
    });
    setShowAddonForm(true);
  };

  const resetAddonForm = () => {
    setAddonForm({ name: '', price: '', category_id: '' });
    setEditingAddon(null);
    setShowAddonForm(false);
  };

  // Reward CRUD
  const handleRewardSubmit = async () => {
    if (!rewardForm.name || !rewardForm.points_required || !rewardForm.reward_type) {
      toast({ title: 'Preencha nome, pontos e tipo', variant: 'destructive' });
      return;
    }

    const payload = {
      name: rewardForm.name,
      description: rewardForm.description,
      points_required: parseInt(rewardForm.points_required),
      reward_type: rewardForm.reward_type,
      is_active: rewardForm.is_active,
    };

    if (editingReward) {
      const { error } = await (supabase as any).from('rewards').update(payload).eq('id', editingReward.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Recompensa atualizada!' });
    } else {
      const { error } = await (supabase as any).from('rewards').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Recompensa criada!' });
    }

    resetRewardForm();
    fetchData();
  };

  const deleteReward = async (id: string) => {
    const { error } = await (supabase as any).from('rewards').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Recompensa removida!' });
    fetchData();
  };

  const editReward = (r: Reward) => {
    setEditingReward(r);
    setRewardForm({
      name: r.name,
      description: r.description || '',
      points_required: String(r.points_required),
      reward_type: r.reward_type || 'custom',
      is_active: r.is_active,
    });
    setShowRewardForm(true);
  };

  const resetRewardForm = () => {
    setRewardForm({ name: '', description: '', points_required: '', reward_type: 'free_delivery', is_active: true });
    setEditingReward(null);
    setShowRewardForm(false);
  };

  const getRewardTypeLabel = (type: string) => REWARD_TYPES.find(t => t.value === type)?.label || type;

  // Promotion CRUD
  const handlePromoSubmit = async () => {
    let imageUrl = promoForm.image_url;
    if (promoImageFile) {
      const url = await uploadImage(promoImageFile);
      if (url) imageUrl = url;
    }

    const itemsArray = promoForm.items
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const payload = {
      title: promoForm.title,
      description: promoForm.description,
      original_price: parseFloat(promoForm.original_price),
      promo_price: parseFloat(promoForm.promo_price),
      valid_until: promoForm.valid_until,
      items: itemsArray,
      image_url: imageUrl || null,
      is_active: promoForm.is_active,
    };

    if (editingPromo) {
      const { error } = await (supabase as any).from('promotions').update(payload as any).eq('id', editingPromo.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Promoção atualizada!' });
    } else {
      const { error } = await (supabase as any).from('promotions').insert(payload as any);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Promoção criada!' });
    }

    resetPromoForm();
    fetchData();
  };

  const deletePromo = async (id: string) => {
    const { error } = await (supabase as any).from('promotions').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Promoção removida!' });
    fetchData();
  };

  const editPromo = (p: Promotion) => {
    setEditingPromo(p);
    setPromoForm({
      title: p.title,
      description: p.description,
      original_price: String(p.original_price),
      promo_price: String(p.promo_price),
      valid_until: p.valid_until,
      items: (p.items || []).join('\n'),
      image_url: p.image_url || '',
      is_active: p.is_active,
    });
    setShowPromoForm(true);
  };

  const resetPromoForm = () => {
    setPromoForm({ title: '', description: '', original_price: '', promo_price: '', valid_until: 'Hoje', items: '', image_url: '', is_active: true });
    setEditingPromo(null);
    setPromoImageFile(null);
    setShowPromoForm(false);
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  const upsellFilteredProducts = upsellCategoryFilter === 'all'
    ? products
    : products.filter(p => p.category_id === upsellCategoryFilter);

  const filteredAddons = addonCategoryFilter === 'all'
    ? addons
    : addons.filter(a => a.category_id === addonCategoryFilter);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name ?? '';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name ?? '';

  const formatPrice = (price: number) =>
    Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (table: string, items: { id: string; sort_order: number }[], event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    const updates = reordered.map((item, idx) =>
      (supabase as any).from(table).update({ sort_order: idx }).eq('id', item.id)
    );
    await Promise.all(updates);
    fetchData();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const iconOptions = [
    'beef', 'cherry', 'cup-soda', 'pizza', 'cake', 'coffee', 'ice-cream-cone',
    'sandwich', 'salad', 'cookie', 'fish', 'egg-fried', 'popcorn', 'wine'
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 min-h-screen">
          {/* Top bar with trigger */}
          <header className="sticky top-0 z-40 glass border-b border-border h-14 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {activeTab === 'products' && 'Produtos'}
              {activeTab === 'categories' && 'Categorias'}
              {activeTab === 'upsells' && 'Ofertas Combo'}
              {activeTab === 'addons' && 'Adicionais'}
              {activeTab === 'promotions' && 'Promoções'}
              {activeTab === 'rewards' && 'Recompensas'}
              {activeTab === 'coupons' && 'Cupons'}
            </h2>
          </header>

          <div className="p-6">

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'gradient-burger text-primary-foreground' : ''}
                >
                  Todos
                </Button>
                {categories.map(c => (
                  <Button
                    key={c.id}
                    variant={selectedCategory === c.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(c.id)}
                    className={selectedCategory === c.id ? 'gradient-burger text-primary-foreground' : ''}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
              <Button onClick={() => { resetProductForm(); setShowProductForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            </div>

            {/* Product Form */}
            {showProductForm && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetProductForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                    <Input
                      value={productForm.name}
                      onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                    <Input
                      value={productForm.description}
                      onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição do produto"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
                    <select
                      value={productForm.category_id}
                      onChange={e => setProductForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Imagem</label>
                    <div className="flex gap-2">
                      <label className="flex-1 h-10 rounded-md border border-input bg-background px-3 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:bg-muted transition-colors">
                        <Upload className="w-4 h-4" />
                        {imageFile ? imageFile.name : 'Escolher imagem'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductForm(f => ({ ...f, is_popular: !f.is_popular }))}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                        productForm.is_popular
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {productForm.is_popular ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                      <span className="text-sm">{productForm.is_popular ? 'Popular' : 'Normal'}</span>
                    </button>
                  </div>
                </div>

                {/* Product Sizes - only show when editing */}
                {editingProduct && (
                  <div className="mt-6 border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Tamanhos (ex: 300ml, 500ml)</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Se cadastrar tamanhos, o preço base será ignorado e o menor preço será exibido na vitrine.
                    </p>

                    {/* Existing sizes */}
                    {productSizes.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {productSizes.map(s => (
                          <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                            <span className="text-sm font-medium text-foreground flex-1">{s.label}</span>
                            <span className="text-sm font-bold text-primary">{formatPrice(s.price)}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeleteSize(s.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new size */}
                    <div className="flex gap-2">
                      <Input
                        value={sizeForm.label}
                        onChange={e => setSizeForm(f => ({ ...f, label: e.target.value }))}
                        placeholder="Ex: 300ml"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={sizeForm.price}
                        onChange={e => setSizeForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="Preço"
                        className="w-28"
                      />
                      <Button variant="outline" size="sm" onClick={handleAddSize}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleProductSubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingProduct ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetProductForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Product List */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd('products', filteredProducts, e)}>
              <SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {filteredProducts.map((p, idx) => {
                    const SortableProduct = () => {
                      const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
                      const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined, position: 'relative' as const };
                      return (
                        <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl overflow-hidden flex items-center gap-3">
                          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pl-2 py-4">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="w-20 h-20 flex-shrink-0 bg-muted flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 py-3 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-semibold text-foreground line-clamp-1">{p.name}</h4>
                              {p.is_popular && <Star className="w-4 h-4 text-primary flex-shrink-0 fill-primary" />}
                              {!p.is_active && (
                                <span className="inline-block bg-destructive/20 text-destructive text-xs font-bold px-2 py-0.5 rounded">PAUSADO</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-primary font-bold text-sm">{formatPrice(Number(p.price))}</span>
                              <span className="text-xs text-muted-foreground">{getCategoryName(p.category_id)}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 pr-3">
                            <Button
                              variant="ghost" size="icon"
                              onClick={async () => {
                                const newActive = !p.is_active;
                                const { error } = await (supabase as any).from('products').update({ is_active: newActive }).eq('id', p.id);
                                if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
                                toast({ title: newActive ? 'Produto ativado!' : 'Produto pausado!' });
                                fetchData();
                              }}
                              className={p.is_active ? 'text-green-500 hover:text-yellow-500' : 'text-yellow-500 hover:text-green-500'}
                              title={p.is_active ? 'Pausar produto' : 'Ativar produto'}
                            >
                              {p.is_active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => editProduct(p)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    };
                    return <SortableProduct key={p.id} />;
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum produto cadastrado</p>
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Categorias</h2>
              <Button onClick={() => { resetCategoryForm(); setShowCategoryForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nova Categoria
              </Button>
            </div>

            {showCategoryForm && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetCategoryForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                    <Input
                      value={categoryForm.name}
                      onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome da categoria"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Slug</label>
                    <Input
                      value={categoryForm.slug}
                      onChange={e => setCategoryForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="slug-da-categoria"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Ícone (Lucide)</label>
                    <select
                      value={categoryForm.icon}
                      onChange={e => setCategoryForm(f => ({ ...f, icon: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleCategorySubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingCategory ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetCategoryForm}>Cancelar</Button>
                </div>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd('categories', categories, e)}>
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {categories.map((c) => {
                    const SortableCategory = () => {
                      const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
                      const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined, position: 'relative' as const };
                      return (
                        <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{c.name}</h4>
                              <p className="text-sm text-muted-foreground">/{c.slug} · {c.icon}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => editCategory(c)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)} className="hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    };
                    return <SortableCategory key={c.id} />;
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* UPSELLS TAB */}
        {activeTab === 'upsells' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Ofertas Combo</h2>
                <p className="text-sm text-muted-foreground">
                  Configure ofertas tipo "Leve também" que aparecem quando o cliente adiciona um produto
                </p>
              </div>
              <Button onClick={() => { resetUpsellForm(); setShowUpsellForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nova Oferta
              </Button>
            </div>

            {showUpsellForm && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingUpsell ? 'Editar Oferta' : 'Nova Oferta'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetUpsellForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category filter for product selection */}
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Filtrar por categoria</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={upsellCategoryFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setUpsellCategoryFilter('all'); setUpsellApplyToCategory(false); }}
                        className={upsellCategoryFilter === 'all' ? 'gradient-burger text-primary-foreground' : ''}
                      >
                        Todos
                      </Button>
                      {categories.map(c => (
                        <Button
                          key={c.id}
                          type="button"
                          variant={upsellCategoryFilter === c.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUpsellCategoryFilter(c.id)}
                          className={upsellCategoryFilter === c.id ? 'gradient-burger text-primary-foreground' : ''}
                        >
                          {c.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Apply to all in category toggle */}
                  {!editingUpsell && upsellCategoryFilter !== 'all' && (
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setUpsellApplyToCategory(!upsellApplyToCategory)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm',
                          upsellApplyToCategory
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        <Layers className="w-4 h-4" />
                        {upsellApplyToCategory
                          ? `✅ Aplicar para todos os ${getCategoryName(upsellCategoryFilter)} (${upsellFilteredProducts.length} produtos)`
                          : `Aplicar para todos os "${getCategoryName(upsellCategoryFilter)}" da categoria`}
                      </button>
                    </div>
                  )}

                  {/* Product principal - hidden when applying to category */}
                  {!upsellApplyToCategory && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Produto principal</label>
                      <select
                        value={upsellForm.product_id}
                        onChange={e => setUpsellForm(f => ({ ...f, product_id: e.target.value }))}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Selecione o produto...</option>
                        {upsellFilteredProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {formatPrice(Number(p.price))}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Produto adicional (oferta)</label>
                    <select
                      value={upsellForm.upsell_product_id}
                      onChange={e => setUpsellForm(f => ({ ...f, upsell_product_id: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione o produto adicional...</option>
                      {products.filter(p => p.id !== upsellForm.product_id).map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {formatPrice(Number(p.price))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço extra (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={upsellForm.extra_price}
                      onChange={e => setUpsellForm(f => ({ ...f, extra_price: e.target.value }))}
                      placeholder="Ex: 10.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Valor que o cliente paga a mais para levar este item</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Texto da oferta</label>
                    <Input
                      value={upsellForm.label}
                      onChange={e => setUpsellForm(f => ({ ...f, label: e.target.value }))}
                      placeholder='Ex: "+ R$10 leve outro Classic"'
                    />
                    <p className="text-xs text-muted-foreground mt-1">Texto que aparece para o cliente</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleUpsellSubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingUpsell ? 'Salvar' : upsellApplyToCategory ? `Criar para ${upsellFilteredProducts.length} produtos` : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetUpsellForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Upsell category filter for list */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-muted-foreground flex items-center mr-2">Filtrar lista:</span>
              <Button
                variant={upsellCategoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUpsellCategoryFilter('all')}
                className={cn('h-7 text-xs', upsellCategoryFilter === 'all' ? 'gradient-burger text-primary-foreground' : '')}
              >
                Todos
              </Button>
              {categories.map(c => (
                <Button
                  key={c.id}
                  variant={upsellCategoryFilter === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpsellCategoryFilter(c.id)}
                  className={cn('h-7 text-xs', upsellCategoryFilter === c.id ? 'gradient-burger text-primary-foreground' : '')}
                >
                  {c.name}
                </Button>
              ))}
            </div>

            {/* Upsells List */}
            <div className="space-y-3">
              {upsells
                .filter(u => {
                  if (upsellCategoryFilter === 'all') return true;
                  const product = products.find(p => p.id === u.product_id);
                  return product?.category_id === upsellCategoryFilter;
                })
                .map(u => (
                <div key={u.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{getProductName(u.product_id)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-primary font-medium">{getProductName(u.upsell_product_id)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        + {formatPrice(Number(u.extra_price))}
                      </span>
                      <span className="text-sm text-muted-foreground">"{u.label}"</span>
                      <span className="text-xs text-muted-foreground/60">
                        {getCategoryName(products.find(p => p.id === u.product_id)?.category_id || '')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => editUpsell(u)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteUpsell(u.id)} className="hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {upsells.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma oferta combo cadastrada</p>
                <p className="text-sm mt-1">Crie ofertas para sugerir produtos adicionais aos clientes</p>
              </div>
            )}
          </div>
        )}

        {/* ADDONS TAB */}
        {activeTab === 'addons' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Adicionais</h2>
                <p className="text-sm text-muted-foreground">
                  Configure extras que o cliente pode adicionar. Cada adicional vale para todos os produtos da categoria selecionada.
                </p>
              </div>
              <Button onClick={() => { resetAddonForm(); setShowAddonForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Novo Adicional
              </Button>
            </div>

            {showAddonForm && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingAddon ? 'Editar Adicional' : 'Novo Adicional'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetAddonForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Nome do adicional</label>
                    <Input
                      value={addonForm.name}
                      onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Bacon extra, Queijo cheddar..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={addonForm.price}
                      onChange={e => setAddonForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="5.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Categoria (aplica a todos da categoria)</label>
                    <select
                      value={addonForm.category_id}
                      onChange={e => setAddonForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione a categoria...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({products.filter(p => p.category_id === c.id).length} produtos)</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      O adicional ficará disponível para todos os produtos desta categoria
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleAddonSubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingAddon ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetAddonForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Addon category filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={addonCategoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddonCategoryFilter('all')}
                className={addonCategoryFilter === 'all' ? 'gradient-burger text-primary-foreground' : ''}
              >
                Todos
              </Button>
              {categories.map(c => (
                <Button
                  key={c.id}
                  variant={addonCategoryFilter === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddonCategoryFilter(c.id)}
                  className={addonCategoryFilter === c.id ? 'gradient-burger text-primary-foreground' : ''}
                >
                  {c.name} ({addons.filter(a => a.category_id === c.id).length})
                </Button>
              ))}
            </div>

            {/* Addons List */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd('product_addons', filteredAddons, e)}>
              <SortableContext items={filteredAddons.map(a => a.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {filteredAddons.map((a) => {
                    const SortableAddon = () => {
                      const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id });
                      const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined, position: 'relative' as const };
                      return (
                        <div ref={setNodeRef} style={style} className={cn("bg-card border border-border rounded-xl p-5 flex items-center justify-between", !a.is_active && 'opacity-60')}>
                          <div className="flex items-center gap-3 flex-1">
                            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">{a.name}</span>
                                <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  + {formatPrice(Number(a.price))}
                                </span>
                                {!a.is_active && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                                    PAUSADO
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                Categoria: {getCategoryName(a.category_id)} · Aplica a {products.filter(p => p.category_id === a.category_id).length} produtos
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                const newActive = !a.is_active;
                                const { error } = await (supabase as any).from('product_addons').update({ is_active: newActive }).eq('id', a.id);
                                if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
                                toast({ title: newActive ? 'Adicional ativado!' : 'Adicional pausado!' });
                                fetchData();
                              }}
                              className={a.is_active ? 'text-green-500 hover:text-yellow-500' : 'text-yellow-500 hover:text-green-500'}
                              title={a.is_active ? 'Pausar adicional' : 'Ativar adicional'}
                            >
                              {a.is_active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => editAddon(a)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteAddon(a.id)} className="hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    };
                    return <SortableAddon key={a.id} />;
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {filteredAddons.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum adicional cadastrado</p>
                <p className="text-sm mt-1">Crie adicionais como bacon extra, queijo cheddar, etc. e associe a uma categoria</p>
              </div>
            )}
          </div>
        )}

        {/* PROMOTIONS TAB */}
        {activeTab === 'promotions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Promoções</h2>
                <p className="text-sm text-muted-foreground">
                  Gerencie as promoções exibidas na página de promoções
                </p>
              </div>
              <Button onClick={() => { resetPromoForm(); setShowPromoForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nova Promoção
              </Button>
            </div>

            {showPromoForm && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingPromo ? 'Editar Promoção' : 'Nova Promoção'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetPromoForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                    <Input
                      value={promoForm.title}
                      onChange={e => setPromoForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ex: Combo Duplo"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Válido até</label>
                    <Input
                      value={promoForm.valid_until}
                      onChange={e => setPromoForm(f => ({ ...f, valid_until: e.target.value }))}
                      placeholder="Ex: Hoje, 17h-19h"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                    <Input
                      value={promoForm.description}
                      onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição da promoção"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço original (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={promoForm.original_price}
                      onChange={e => setPromoForm(f => ({ ...f, original_price: e.target.value }))}
                      placeholder="79.60"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço promocional (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={promoForm.promo_price}
                      onChange={e => setPromoForm(f => ({ ...f, promo_price: e.target.value }))}
                      placeholder="59.90"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Itens incluídos (um por linha)</label>
                    <textarea
                      value={promoForm.items}
                      onChange={e => setPromoForm(f => ({ ...f, items: e.target.value }))}
                      placeholder={"2x X-Burguer Clássico\n2x Refrigerante Lata\n1x Batata Grande"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Imagem</label>
                    <label className="flex-1 h-10 rounded-md border border-input bg-background px-3 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Upload className="w-4 h-4" />
                      {promoImageFile ? promoImageFile.name : 'Escolher imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setPromoImageFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPromoForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                        promoForm.is_active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm">{promoForm.is_active ? '✅ Ativa' : '❌ Inativa'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handlePromoSubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingPromo ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetPromoForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Promotions List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden group">
                  <div className="h-40 bg-muted flex items-center justify-center relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <Tag className="w-12 h-12 text-muted-foreground/30" />
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="gradient-acai text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {Math.round((1 - Number(p.promo_price) / Number(p.original_price)) * 100)}% OFF
                      </span>
                    </div>
                    {!p.is_active && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          Inativa
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground line-clamp-1 mb-1">{p.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground line-through mr-2">{formatPrice(Number(p.original_price))}</span>
                        <span className="text-primary font-bold">{formatPrice(Number(p.promo_price))}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => editPromo(p)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePromo(p.id)} className="hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {promotions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma promoção cadastrada</p>
                <p className="text-sm mt-1">Crie promoções para atrair mais clientes</p>
              </div>
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Recompensas de Fidelidade</h2>
              <Button onClick={() => { resetRewardForm(); setShowRewardForm(true); }} className="gradient-burger text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nova Recompensa
              </Button>
            </div>

            {showRewardForm && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-4">
                  {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nome da recompensa"
                    value={rewardForm.name}
                    onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <Input
                    placeholder="Pontos necessários"
                    type="number"
                    value={rewardForm.points_required}
                    onChange={e => setRewardForm(f => ({ ...f, points_required: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <select
                    value={rewardForm.reward_type}
                    onChange={e => setRewardForm(f => ({ ...f, reward_type: e.target.value }))}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    {REWARD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rewardForm.is_active}
                      onChange={e => setRewardForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Ativa</span>
                  </div>
                  <Input
                    placeholder="Descrição (opcional)"
                    value={rewardForm.description}
                    onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                    className="bg-background border-border sm:col-span-2"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleRewardSubmit} className="gradient-burger text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" /> {editingReward ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={resetRewardForm}>
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map(r => (
                <div key={r.id} className={cn(
                  'bg-card border rounded-2xl p-5 flex items-start gap-4',
                  r.is_active ? 'border-border' : 'border-destructive/30 opacity-60'
                )}>
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    r.is_active ? 'bg-primary/15' : 'bg-muted'
                  )}>
                    <Gift className={cn('w-5 h-5', r.is_active ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{r.name}</h4>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {getRewardTypeLabel(r.reward_type || 'custom')}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => editReward(r)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteReward(r.id)} className="hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-3 h-3 text-primary" />
                      <span className="text-sm font-bold text-primary">{r.points_required} pontos</span>
                      {!r.is_active && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Inativa</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rewards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma recompensa cadastrada</p>
                <p className="text-sm mt-1">Crie recompensas para o programa de fidelidade</p>
              </div>
            )}
          </div>
        )}

        {/* COUPONS TAB */}
        {activeTab === 'coupons' && <CouponsTab />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
