import { Package, LayoutGrid, Gift, Layers, Tag, Star, ClipboardList, BarChart3, LogOut, Home, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';

type AdminTab = 'products' | 'categories' | 'upsells' | 'promotions' | 'addons' | 'rewards' | 'coupons';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const menuItems: { tab: AdminTab; label: string; icon: typeof Package }[] = [
  { tab: 'products', label: 'Produtos', icon: Package },
  { tab: 'categories', label: 'Categorias', icon: LayoutGrid },
  { tab: 'upsells', label: 'Ofertas Combo', icon: Gift },
  { tab: 'addons', label: 'Adicionais', icon: Layers },
  { tab: 'promotions', label: 'Promoções', icon: Tag },
  { tab: 'coupons', label: 'Cupons', icon: Ticket },
  { tab: 'rewards', label: 'Recompensas', icon: Star },
];

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-bold text-foreground">
          Painel <span className="text-gradient-burger">Admin</span>
        </h2>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    isActive={activeTab === item.tab}
                    onClick={() => onTabChange(item.tab)}
                    className={activeTab === item.tab ? 'gradient-burger text-primary-foreground' : ''}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/admin/pedidos')}>
                  <ClipboardList className="h-4 w-4" />
                  <span>Pedidos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/admin/relatorios')}>
                  <BarChart3 className="h-4 w-4" />
                  <span>Relatórios</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate('/')}>
              <Home className="h-4 w-4" />
              <span>Voltar à Loja</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
