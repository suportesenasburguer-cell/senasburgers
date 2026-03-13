import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { User, Mail, Lock, Phone, Star } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  allowGuest?: boolean;
  onGuestContinue?: () => void;
}

const AuthDialog = ({ open, onOpenChange, onSuccess, allowGuest = false, onGuestContinue }: AuthDialogProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useCustomerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Erro ao entrar', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Bem-vindo de volta! 🎉' });
        onOpenChange(false);
        onSuccess?.();
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
        toast({ title: 'Conta criada! 🎉', description: 'Você já está logado.' });
        onOpenChange(false);
        onSuccess?.();
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 border border-primary/20 rounded-xl p-3 flex items-center gap-3 mb-2">
          <Star className="w-6 h-6 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Faça login para finalizar seu pedido e acumular pontos no programa de fidelidade!
          </p>
        </div>

        <div className="flex bg-muted rounded-xl p-1 mb-4">
          <button
            onClick={() => setMode('login')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === 'login' ? 'gradient-burger text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === 'register' ? 'gradient-burger text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="auth-name" className="text-sm font-semibold text-foreground">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="auth-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="pl-10 bg-background border-border" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-phone" className="text-sm font-semibold text-foreground">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="auth-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(84) 99999-9999" className="pl-10 bg-background border-border" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-sm font-semibold text-foreground">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 bg-background border-border" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-sm font-semibold text-foreground">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="pl-10 bg-background border-border" minLength={6} required />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full gradient-burger text-primary-foreground py-5 rounded-xl font-bold text-lg">
            {submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </Button>
        </form>

        {allowGuest && (
          <button
            onClick={() => {
              localStorage.setItem('guest-checkout', 'true');
              onOpenChange(false);
              onGuestContinue?.();
            }}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Pedir como convidado
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
