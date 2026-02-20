import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Tag, ClipboardList, ShoppingCart, Menu, X, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/hooks/use-customer-auth';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/promocoes', label: 'Promoções', icon: Tag },
  { path: '/pedidos', label: 'Pedidos', icon: ClipboardList },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { getItemCount } = useCart();
  const { user, profile } = useCustomerAuth();
  const itemCount = getItemCount();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight" style={{
            textShadow: '0 1px 2px hsl(20 20% 15% / 0.15), 0 2px 4px hsl(25 95% 50% / 0.1)',
          }}>
            <span className="text-gradient-burger">Sena's</span>
            <span className="text-foreground"> Burgers</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300',
                location.pathname === item.path
                  ? 'gradient-burger text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {/* Cart Button */}
          <Link
            to="/carrinho"
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300',
              location.pathname === '/carrinho'
                ? 'gradient-burger text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Carrinho
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 gradient-acai text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Account / Login */}
          <Link
            to={user ? '/conta' : '/conta/login'}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300',
              ['/conta', '/conta/login'].includes(location.pathname)
                ? 'gradient-burger text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <User className="w-4 h-4" />
            {user ? (profile?.full_name?.split(' ')[0] || 'Conta') : 'Entrar'}
          </Link>

        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-3">
          <Link to={user ? '/conta' : '/conta/login'} className="relative">
            <User className="w-6 h-6 text-foreground" />
          </Link>
          <Link to="/carrinho" className="relative">
            <ShoppingCart className="w-6 h-6 text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 gradient-acai text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-foreground p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <nav className="md:hidden glass border-t border-border animate-fade-in">
          <div className="container px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300',
                  location.pathname === item.path
                    ? 'gradient-burger text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
