import { Clock, Instagram } from 'lucide-react';
import { MessageCircle } from 'lucide-react';

import { isStoreOpen } from '@/lib/store-hours';

const Footer = () => {
  const open = isStoreOpen();

  return (
    <footer className="bg-card border-t border-border py-12 px-4">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-gradient-burger">Sena's</span>
              <span className="text-foreground"> Burgers</span>
            </h3>
            <p className="text-muted-foreground">
              Hambúrgueres artesanais feitos com aquele sabor que só a Sena's tem.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold text-foreground mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/5584988760462"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
                <span>(84) 9 8876-0462</span>
              </a>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span>Dom, Seg, Ter, Qui, Sex e Sáb: 18:15 às 23:00</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${open ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  {open ? 'Aberto agora' : 'Fechado'}
                </span>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-lg font-bold text-foreground mb-4">Redes Sociais</h4>
            <div className="flex gap-4">
              <a
                href="http://instagram.com/senasburguers_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Sena's Burgers. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
