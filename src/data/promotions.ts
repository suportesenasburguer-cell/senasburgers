import { MenuItem } from '@/types/menu';
import acaiBowl from '@/assets/acai-bowl.jpg';
import burgerClassic from '@/assets/burger-classic.jpg';

export interface Promotion {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  promoPrice: number;
  image: string;
  validUntil: string;
  items: string[];
}

export const dailyPromotions: Promotion[] = [
  {
    id: 'promo1',
    title: 'Combo Duplo',
    description: '2 X-Burguer Clássico + 2 Refrigerantes + Batata Grande',
    originalPrice: 79.60,
    promoPrice: 59.90,
    image: burgerClassic,
    validUntil: 'Hoje',
    items: ['2x X-Burguer Clássico', '2x Refrigerante Lata', '1x Batata Grande'],
  },
  {
    id: 'promo2',
    title: 'Açaí em Dobro',
    description: 'Leve 2 Açaís Premium 500ml pelo preço de 1 e meio',
    originalPrice: 57.80,
    promoPrice: 42.90,
    image: acaiBowl,
    validUntil: 'Hoje',
    items: ['2x Açaí Premium 500ml'],
  },
  {
    id: 'promo3',
    title: 'Happy Hour',
    description: 'Das 17h às 19h: X-Bacon + Batata + Bebida',
    originalPrice: 52.70,
    promoPrice: 39.90,
    image: burgerClassic,
    validUntil: '17h-19h',
    items: ['1x X-Bacon Duplo', '1x Batata Frita', '1x Refrigerante ou Suco'],
  },
];
