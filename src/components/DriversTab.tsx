import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, Truck, Plus, UserPlus, Mail, Phone, User } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface DriverUser {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  created_at: string;
}

const DriversTab = () => {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      // Get driver role user_ids
      const { data: driverRoles } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'driver');

      if (!driverRoles || driverRoles.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driverIds = driverRoles.map((d: any) => d.user_id);

      // Get user details via RPC
      const { data: allUsers } = await (supabase as any).rpc('admin_list_users');

      const driverList: DriverUser[] = driverIds
        .map((id: string) => {
          const u = (allUsers || []).find((u: any) => u.id === id);
          return u ? {
            id: u.id,
            email: u.email || '',
            display_name: u.display_name || '',
            phone: u.phone || '',
            created_at: u.created_at || '',
          } : null;
        })
        .filter(Boolean) as DriverUser[];

      setDrivers(driverList);
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      toast({ title: 'Erro ao carregar entregadores', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast({ title: 'Preencha email e senha', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      // Create user via admin RPC
      const { data: newUser, error: createError } = await (supabase as any).rpc('admin_create_driver', {
        driver_email: form.email,
        driver_password: form.password,
        driver_name: form.name || null,
        driver_phone: form.phone || null,
      });

      if (createError) throw createError;

      toast({ title: '✅ Entregador criado com sucesso!', description: `${form.name || form.email} foi adicionado como entregador.` });
      setForm({ email: '', password: '', name: '', phone: '' });
      setShowForm(false);
      fetchDrivers();
    } catch (err: any) {
      console.error('Error creating driver:', err);
      toast({ title: 'Erro ao criar entregador', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveDriver = async (userId: string, userName: string) => {
    try {
      // Remove driver role only (don't delete user account)
      const { error } = await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'driver');

      if (error) throw error;

      toast({ title: 'Entregador removido', description: `${userName || 'Entregador'} não é mais entregador.` });
      fetchDrivers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Badge variant="secondary" className="text-sm">
          <Truck className="h-3 w-3 mr-1" />
          {drivers.length} entregador{drivers.length !== 1 ? 'es' : ''}
        </Badge>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gradient-burger text-primary-foreground"
            onClick={() => setShowForm(!showForm)}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Novo Entregador
          </Button>
          <Button variant="outline" size="icon" onClick={fetchDrivers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-muted/30 border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Criar Conta de Entregador
          </h3>
          <p className="text-xs text-muted-foreground">
            Uma nova conta será criada e automaticamente receberá a permissão de entregador.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="entregador@email.com"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha *</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do entregador"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="gradient-burger text-primary-foreground"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Criar Entregador
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum entregador cadastrado</p>
          <p className="text-xs mt-1">Clique em "Novo Entregador" para adicionar</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">
                    {driver.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {driver.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {driver.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {driver.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(driver.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Remover entregador">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover entregador?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{driver.display_name || driver.email}</strong> perderá a permissão de entregador. A conta de usuário não será excluída.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveDriver(driver.id, driver.display_name || driver.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
