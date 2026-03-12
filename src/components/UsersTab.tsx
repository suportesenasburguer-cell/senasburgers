import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Trash2, Search, RefreshCw, Users, Award, Phone, Calendar, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  created_at: string;
  loyalty_points?: number;
  total_orders?: number;
  total_spent?: number;
}

const PAGE_SIZE = 20;

const UsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all auth users via RPC
      const { data: authUsers, error } = await (supabase as any).rpc('admin_list_users');
      if (error) throw error;

      if (!authUsers || authUsers.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = authUsers.map((u: any) => u.id);

      // Fetch loyalty points and order stats in parallel
      const [pointsRes, ordersRes] = await Promise.all([
        (supabase as any).from('loyalty_points').select('user_id, points').in('user_id', userIds),
        (supabase as any).from('customer_orders').select('user_id, total').in('user_id', userIds),
      ]);

      const pointsMap: Record<string, number> = {};
      (pointsRes.data || []).forEach((p: any) => {
        pointsMap[p.user_id] = (pointsMap[p.user_id] || 0) + p.points;
      });

      const ordersMap: Record<string, { count: number; total: number }> = {};
      (ordersRes.data || []).forEach((o: any) => {
        if (!ordersMap[o.user_id]) ordersMap[o.user_id] = { count: 0, total: 0 };
        ordersMap[o.user_id].count++;
        ordersMap[o.user_id].total += Number(o.total) || 0;
      });

      const enriched: UserProfile[] = authUsers.map((u: any) => ({
        ...u,
        loyalty_points: pointsMap[u.id] || 0,
        total_orders: ordersMap[u.id]?.count || 0,
        total_spent: ordersMap[u.id]?.total || 0,
      }));

      setUsers(enriched);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast({ title: 'Erro ao carregar usuários', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const { error } = await (supabase as any).rpc('admin_delete_user', { target_user_id: userId });
      if (error) throw error;

      toast({ title: 'Usuário removido', description: `${userName || 'Usuário'} foi removido com sucesso.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const handleResetPoints = async (userId: string) => {
    try {
      await (supabase as any).from('loyalty_points').delete().eq('user_id', userId);
      toast({ title: 'Pontos zerados' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const formatPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Client-side filtering
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s)
    );
  });

  // Client-side pagination
  const page = 0;
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Badge variant="secondary" className="text-sm">
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
        </Badge>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-72"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Pontos</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                    </TableCell>
                    <TableCell>
                      {user.email ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.loyalty_points! > 0 ? 'default' : 'secondary'} className="font-mono">
                        <Award className="h-3 w-3 mr-1" />
                        {user.loyalty_points}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">{user.total_orders}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(user.total_spent || 0)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Zerar pontos">
                              <Award className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zerar pontos?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Todos os pontos de fidelidade de <strong>{user.display_name || 'este usuário'}</strong> serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleResetPoints(user.id)}>
                                Zerar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Excluir usuário">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O perfil de <strong>{user.display_name || user.email || 'este usuário'}</strong> e todos os dados associados serão removidos permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id, user.display_name || user.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersTab;
