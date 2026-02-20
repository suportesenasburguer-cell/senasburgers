export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'hamburgueres' | 'acai' | 'bebidas';
  isPopular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: 'burger' | 'acai';
}

export interface ComboSelection {
  itemId: string;
  addBatata: boolean;
  bebida: string | null;
}
