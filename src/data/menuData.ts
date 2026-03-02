import burgerClassic from '@/assets/burger-classic.jpg';
import acaiBowl from '@/assets/acai-bowl.jpg';
import drink from '@/assets/drink.jpg';

import { MenuItem, Category } from '@/types/menu';

export const categories: Category[] = [
  { id: 'hamburgueres', name: 'Hambúrgueres', icon: '🍔', color: 'burger' },
  { id: 'acai', name: 'Açaí', icon: '🍇', color: 'acai' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤', color: 'burger' },
];

export const comboAddons = {
  batata: {
    id: 'batata',
    name: 'Batata Frita',
    price: 8.90,
    icon: '🍟',
  },
  bebidas: [
    { id: 'refri', name: 'Refrigerante Lata', price: 5.90, icon: '🥤' },
    { id: 'suco', name: 'Suco Natural 300ml', price: 8.90, icon: '🧃' },
  ],
};

export const menuItems: MenuItem[] = [
  // Hambúrgueres
  {
    id: '1',
    name: 'X-Burguer Clássico',
    description: 'Pão brioche, hambúrguer 180g, queijo cheddar, alface, tomate e molho especial',
    price: 28.90,
    image: burgerClassic,
    category: 'hamburgueres',
    isPopular: true,
  },
  {
    id: '2',
    name: 'X-Bacon Duplo',
    description: 'Pão brioche, 2x hambúrguer 180g, bacon crocante, queijo cheddar derretido e cebola caramelizada',
    price: 38.90,
    image: burgerClassic,
    category: 'hamburgueres',
    isPopular: true,
  },
  {
    id: '3',
    name: 'X-Salada Premium',
    description: 'Pão australiano, hambúrguer 200g, mix de queijos, alface americana, tomate e maionese trufada',
    price: 34.90,
    image: burgerClassic,
    category: 'hamburgueres',
  },
  {
    id: '4',
    name: 'X-Tudo Especial',
    description: 'Pão brioche, hambúrguer 180g, bacon, ovo, queijo, presunto, alface, tomate e molho especial',
    price: 42.90,
    image: burgerClassic,
    category: 'hamburgueres',
  },
  {
    id: '15',
    name: 'X-Frango Crocante',
    description: 'Pão brioche, filé de frango empanado, queijo, alface, tomate e maionese especial',
    price: 32.90,
    image: burgerClassic,
    category: 'hamburgueres',
  },
  {
    id: '16',
    name: 'Veggie Burger',
    description: 'Pão integral, hambúrguer de grão de bico, queijo coalho, rúcula, tomate seco e molho pesto',
    price: 29.90,
    image: burgerClassic,
    category: 'hamburgueres',
  },
  // Açaí
  {
    id: '5',
    name: 'Açaí Tradicional 300ml',
    description: 'Açaí puro batido com banana, granola, leite em pó e mel',
    price: 18.90,
    image: acaiBowl,
    category: 'acai',
    isPopular: true,
  },
  {
    id: '6',
    name: 'Açaí Premium 500ml',
    description: 'Açaí com morango, banana, kiwi, granola, leite condensado, nutella e paçoca',
    price: 28.90,
    image: acaiBowl,
    category: 'acai',
    isPopular: true,
  },
  {
    id: '7',
    name: 'Açaí Fitness 400ml',
    description: 'Açaí puro com banana, mel, granola sem açúcar e whey protein',
    price: 24.90,
    image: acaiBowl,
    category: 'acai',
  },
  {
    id: '8',
    name: 'Açaí na Tigela 700ml',
    description: 'Açaí cremoso com frutas variadas, granola, leite condensado, paçoca e calda de morango',
    price: 34.90,
    image: acaiBowl,
    category: 'acai',
  },
  // Bebidas
  {
    id: '9',
    name: 'Refrigerante Lata',
    description: 'Coca-Cola, Guaraná Antarctica ou Sprite 350ml',
    price: 6.90,
    image: drink,
    category: 'bebidas',
  },
  {
    id: '10',
    name: 'Suco Natural 500ml',
    description: 'Laranja, limão, maracujá ou morango',
    price: 12.90,
    image: drink,
    category: 'bebidas',
  },
  {
    id: '11',
    name: 'Milkshake 400ml',
    description: 'Chocolate, morango, ovomaltine ou nutella',
    price: 16.90,
    image: drink,
    category: 'bebidas',
    isPopular: true,
  },
  {
    id: '12',
    name: 'Água Mineral 500ml',
    description: 'Com ou sem gás',
    price: 4.90,
    image: drink,
    category: 'bebidas',
  },
];
