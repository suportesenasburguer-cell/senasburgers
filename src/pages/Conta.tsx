import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { useLoyalty } from '@/hooks/use-loyalty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  LogOut, ArrowLeft, User, Phone, Mail, Edit2, Save, X,
  Star, Gift, Trophy, MapPin, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Conta = () => {
  const { user, profile, loading, signOut, updateProfile } = useCustomerAuth();
  const { points, rewards, redemptions, loading: loyaltyLoading, redeemReward } = useLoyalty();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'recompensas'>('perfil');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/conta/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: (profile as any).full_name || '',
        phone: (profile as any).phone || '',
        gender: (profile as any).gender || '',
        address_street: (profile as any).address_street || '',
        address_number: (profile as any).address_number || '',
        address_complement: (profile as any).address_complement || '',
        address_neighborhood: (profile as any).address_neighborhood || '',
        address_city: (profile as any).address_city || '',
        address_state: (profile as any).address_state || '',
        address_zip: (profile as any).address_zip || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(form);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado! ✅' });
      setEditing(false);
    }
    setSaving(false);
  };

  const handleRedeem = async (reward: any) => {
    setRedeemingId(reward.id);
    const { error } = await redeemReward(reward);
    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
    } else {
      toast({ title: '🎉 Recompensa resgatada!', description: `Você resgatou: ${reward.name}` });
    }
    setRedeemingId(null);
  };

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4 max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Profile Card with Points */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full gradient-burger flex items-center justify-center text-primary-foreground font-bold text-xl">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.full_name || 'Cliente'}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Points Badge */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Seus Pontos</p>
              <p className="text-2xl font-bold text-primary">{loyaltyLoading ? '...' : points}</p>
            </div>
            <Trophy className="w-6 h-6 text-primary/40" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('perfil')}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2',
              activeTab === 'perfil'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-4 h-4" />
            Meu Perfil
          </button>
          <button
            onClick={() => setActiveTab('recompensas')}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2',
              activeTab === 'recompensas'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <Gift className="w-4 h-4" />
            Recompensas
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'perfil' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Dados Pessoais
                </h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">Nome Completo</Label>
                      <Input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="Seu nome completo" className="bg-background border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">Telefone</Label>
                      <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(11) 99999-9999" className="bg-background border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">Sexo</Label>
                      <select
                        value={form.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Selecione</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                        <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      Endereço
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input value={form.address_zip} onChange={(e) => updateField('address_zip', e.target.value)} placeholder="CEP" className="bg-background border-border" />
                      <Input value={form.address_street} onChange={(e) => updateField('address_street', e.target.value)} placeholder="Rua / Avenida" className="bg-background border-border sm:col-span-2" />
                      <Input value={form.address_number} onChange={(e) => updateField('address_number', e.target.value)} placeholder="Número" className="bg-background border-border" />
                      <Input value={form.address_complement} onChange={(e) => updateField('address_complement', e.target.value)} placeholder="Complemento" className="bg-background border-border" />
                      <Input value={form.address_neighborhood} onChange={(e) => updateField('address_neighborhood', e.target.value)} placeholder="Bairro" className="bg-background border-border" />
                      <Input value={form.address_city} onChange={(e) => updateField('address_city', e.target.value)} placeholder="Cidade" className="bg-background border-border" />
                      <Input value={form.address_state} onChange={(e) => updateField('address_state', e.target.value)} placeholder="Estado" className="bg-background border-border" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-burger text-primary-foreground font-bold">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setEditing(false);
                      if (profile) {
                        setForm({
                          full_name: (profile as any).full_name || '',
                          phone: (profile as any).phone || '',
                          gender: (profile as any).gender || '',
                          address_street: (profile as any).address_street || '',
                          address_number: (profile as any).address_number || '',
                          address_complement: (profile as any).address_complement || '',
                          address_neighborhood: (profile as any).address_neighborhood || '',
                          address_city: (profile as any).address_city || '',
                          address_state: (profile as any).address_state || '',
                          address_zip: (profile as any).address_zip || '',
                        });
                      }
                    }}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow icon={<User className="w-4 h-4" />} label="Nome" value={profile?.full_name} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={user.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={profile?.phone} />
                  <InfoRow label="Sexo" value={(profile as any)?.gender ? genderLabel((profile as any).gender) : null} />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Endereço" value={formatAddress(profile as any)} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Rewards Tab */}
        {activeTab === 'recompensas' && (
          <div className="space-y-4">
            {rewards.length === 0 && !loyaltyLoading && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma recompensa disponível no momento.</p>
                <p className="text-xs text-muted-foreground mt-1">Continue fazendo pedidos para acumular pontos!</p>
              </div>
            )}

            {rewards.map(reward => {
              const canRedeem = points >= reward.points_required;
              const isRedeeming = redeemingId === reward.id;
              const wasRedeemed = redemptions.some(r => r.reward_id === reward.id && r.status === 'pending');

              return (
                <div key={reward.id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                    canRedeem ? 'bg-primary/15' : 'bg-muted'
                  )}>
                    {reward.image_url ? (
                      <img src={reward.image_url} alt={reward.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Gift className={cn('w-6 h-6', canRedeem ? 'text-primary' : 'text-muted-foreground')} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-sm">{reward.name}</h4>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-primary" />
                      <span className={cn('text-xs font-bold', canRedeem ? 'text-primary' : 'text-muted-foreground')}>
                        {reward.points_required} pontos
                      </span>
                      {!canRedeem && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (faltam {reward.points_required - points})
                        </span>
                      )}
                    </div>
                  </div>

                  {wasRedeemed ? (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Resgatado
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!canRedeem || isRedeeming}
                      onClick={() => handleRedeem(reward)}
                      className={cn(
                        'rounded-xl text-xs font-bold',
                        canRedeem ? 'gradient-burger text-primary-foreground' : ''
                      )}
                      variant={canRedeem ? 'default' : 'outline'}
                    >
                      {isRedeeming ? '...' : 'Resgatar'}
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Redemption History */}
            {redemptions.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 mt-4">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Histórico de Resgates
                </h4>
                <div className="space-y-2">
                  {redemptions.slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {rewards.find(rw => rw.id === r.reward_id)?.name || 'Recompensa'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-primary" />
                        <span className="text-xs font-bold text-primary">-{r.points_spent}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full py-5 text-destructive hover:bg-destructive/10 mt-6"
          onClick={() => { signOut(); navigate('/'); }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

const genderLabel = (g: string) => {
  const map: Record<string, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    outro: 'Outro',
    prefiro_nao_dizer: 'Prefiro não dizer',
  };
  return map[g] || g;
};

const formatAddress = (p: any) => {
  if (!p) return null;
  const parts = [
    p.address_street,
    p.address_number && `nº ${p.address_number}`,
    p.address_complement,
    p.address_neighborhood,
    p.address_city,
    p.address_state,
    p.address_zip,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const InfoRow = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
    {icon && <span className="text-primary mt-0.5">{icon}</span>}
    {!icon && <span className="w-4" />}
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  </div>
);

export default Conta;
