import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  LogOut, Store, CreditCard, MessageSquare, BarChart3,
  Bell, Star, Truck, Shield, Zap, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'pagamentos' | 'comunicacao' | 'gestao' | 'marketing';
  price: string;
  enabled: boolean;
}

const DEFAULT_FEATURES: Feature[] = [
  {
    id: 'pix_payment',
    name: 'Pagamento via PIX',
    description: 'Receba pagamentos via PIX direto na plataforma com QR Code gerado automaticamente.',
    icon: Zap,
    category: 'pagamentos',
    price: 'R$ 79,90/mês',
    enabled: false,
  },
  {
    id: 'card_payment',
    name: 'Cartão de Crédito/Débito',
    description: 'Aceite cartões de crédito e débito com integração Stripe. Parcelamento em até 12x.',
    icon: CreditCard,
    category: 'pagamentos',
    price: 'R$ 149,90/mês',
    enabled: false,
  },
  {
    id: 'whatsapp_bot',
    name: 'Bot WhatsApp',
    description: 'Atendimento automatizado via WhatsApp com confirmação de pedidos e rastreamento.',
    icon: MessageSquare,
    category: 'comunicacao',
    price: 'R$ 99,90/mês',
    enabled: false,
  },
  {
    id: 'push_notifications',
    name: 'Notificações Push',
    description: 'Envie notificações push para clientes sobre promoções, status de pedidos e novidades.',
    icon: Bell,
    category: 'comunicacao',
    price: 'R$ 49,90/mês',
    enabled: false,
  },
  {
    id: 'analytics_dashboard',
    name: 'Dashboard de Analytics',
    description: 'Painel completo de métricas: vendas, produtos mais vendidos, horários de pico, ticket médio.',
    icon: BarChart3,
    category: 'gestao',
    price: 'R$ 89,90/mês',
    enabled: false,
  },
  {
    id: 'delivery_tracking',
    name: 'Rastreamento de Entrega',
    description: 'Acompanhamento em tempo real da entrega com mapa e estimativa de chegada para o cliente.',
    icon: Truck,
    category: 'gestao',
    price: 'R$ 69,90/mês',
    enabled: false,
  },
  {
    id: 'loyalty_program',
    name: 'Programa de Fidelidade',
    description: 'Sistema de pontos e recompensas: a cada X pedidos, o cliente ganha descontos ou produtos grátis.',
    icon: Star,
    category: 'marketing',
    price: 'R$ 59,90/mês',
    enabled: false,
  },
  {
    id: 'order_management',
    name: 'Gestão Avançada de Pedidos',
    description: 'Painel de controle de pedidos com status em tempo real, impressão de comanda e histórico completo.',
    icon: Package,
    category: 'gestao',
    price: 'R$ 119,90/mês',
    enabled: false,
  },
  {
    id: 'fraud_protection',
    name: 'Proteção Anti-Fraude',
    description: 'Sistema de verificação de pedidos suspeitos, bloqueio de clientes problemáticos e validação de endereços.',
    icon: Shield,
    category: 'gestao',
    price: 'R$ 39,90/mês',
    enabled: false,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  pagamentos: '💳 Pagamentos',
  comunicacao: '💬 Comunicação',
  gestao: '⚙️ Gestão',
  marketing: '📣 Marketing',
};

const STORAGE_KEY = 'senas_store_features';

const Loja = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login?redirect=/loja');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Record<string, boolean> = JSON.parse(saved);
        setFeatures(DEFAULT_FEATURES.map(f => ({ ...f, enabled: !!parsed[f.id] })));
      } catch {
        setFeatures(DEFAULT_FEATURES);
      }
    } else {
      setFeatures(DEFAULT_FEATURES);
    }
  }, []);

  const toggleFeature = (id: string) => {
    setFeatures(prev => {
      const updated = prev.map(f =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      );
      const state: Record<string, boolean> = {};
      updated.forEach(f => { state[f.id] = f.enabled; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const feature = updated.find(f => f.id === id);
      if (feature) {
        toast({
          title: feature.enabled ? '✅ Módulo ativado' : '⛔ Módulo desativado',
          description: feature.name,
        });
      }
      return updated;
    });
  };

  const activeCount = features.filter(f => f.enabled).length;
  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const filtered = filterCategory === 'all' ? features : features.filter(f => f.category === filterCategory);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              <span className="text-gradient-burger">Loja</span> de Módulos
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              Painel Admin
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary">{features.length}</p>
            <p className="text-sm text-muted-foreground">Módulos disponíveis</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{activeCount}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center col-span-2 md:col-span-1">
            <p className="text-3xl font-bold text-muted-foreground">{features.length - activeCount}</p>
            <p className="text-sm text-muted-foreground">Inativos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className={cn(filterCategory === cat && 'gradient-burger text-primary-foreground')}
            >
              {cat === 'all' ? '🔥 Todos' : CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={cn(
                  'bg-card border rounded-xl p-5 transition-all duration-300',
                  feature.enabled
                    ? 'border-primary/50 shadow-lg shadow-primary/10'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      feature.enabled
                        ? 'gradient-burger'
                        : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        feature.enabled ? 'text-primary-foreground' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm">{feature.name}</h3>
                        {feature.enabled && (
                          <span className="text-[10px] font-bold uppercase bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {feature.description}
                      </p>
                      <span className="text-xs font-semibold text-primary">{feature.price}</span>
                    </div>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Painel exclusivo do desenvolvedor. Os módulos ativados aqui ficam disponíveis na plataforma.
        </p>
      </div>
    </div>
  );
};

export default Loja;
