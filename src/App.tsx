import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/use-auth";
import { CustomerAuthProvider } from "@/hooks/use-customer-auth";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Promocoes from "./pages/Promocoes";
import Pedidos from "./pages/Pedidos";
import Carrinho from "./pages/Carrinho";
import ContaLogin from "./pages/ContaLogin";
import Conta from "./pages/Conta";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import AdminPedidos from "./pages/AdminPedidos";
import AdminRelatorios from "./pages/AdminRelatorios";
import AdminVisitas from "./pages/AdminVisitas";
import VisitorTracker from "./components/VisitorTracker";
import Loja from "./pages/Loja";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Force dark theme
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <CartProvider>
            <CustomerAuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <VisitorTracker />
                <Routes>
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/pedidos" element={<AdminPedidos />} />
                  <Route path="/admin/relatorios" element={<AdminRelatorios />} />
                  <Route path="/admin/visitas" element={<AdminVisitas />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/loja" element={<Loja />} />
                  <Route path="*" element={
                    <>
                      <Navbar />
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/promocoes" element={<Promocoes />} />
                        <Route path="/pedidos" element={<Pedidos />} />
                        <Route path="/carrinho" element={<Carrinho />} />
                        <Route path="/conta/login" element={<ContaLogin />} />
                        <Route path="/conta" element={<Conta />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </>
                  } />
                </Routes>
              </BrowserRouter>
            </CustomerAuthProvider>
          </CartProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
