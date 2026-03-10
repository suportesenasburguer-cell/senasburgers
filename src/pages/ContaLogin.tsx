import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Lock, Phone, ArrowLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const ContaLogin = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, user } = useCustomerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/conta');
  }, [user, navigate]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Erro ao entrar', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Bem-vindo de volta! 🎉' });
        navigate('/conta');
      }
    } else {
      if (!fullName.trim()) {
        toast({ title: 'Preencha seu nome', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        toast({ title: 'Erro ao criar conta', description: error, variant: 'destructive' });
      } else {
        toast({
          title: 'Conta criada! 🎉',
          description: 'Verifique seu e-mail para confirmar.',
        });
        setMode('login');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4 max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'login'
              ? 'Acesse sua conta para acumular pontos'
              : 'Cadastre-se e participe do programa de fidelidade'}
          </p>
        </div>

        {/* Loyalty badge */}
        <div className="bg-card border border-primary/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Star className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Programa de Fidelidade</p>
            <p className="text-xs text-muted-foreground">Ganhe 1 ponto por item no pedido e troque por recompensas!</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode === 'login' ? 'gradient-burger text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode === 'register' ? 'gradient-burger text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10 bg-background border-border"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                  Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-10 bg-background border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pl-10 bg-background border-border"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full gradient-burger text-primary-foreground py-6 rounded-xl font-bold text-lg"
          >
            {submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ContaLogin;
