import { cn } from '@/lib/utils';
import CategoryIcon from './CategoryIcon';

interface CategoryButtonProps {
  name: string;
  icon: string;
  isActive: boolean;
  color?: 'burger' | 'acai';
  onClick: () => void;
}

const CategoryButton = ({ name, icon, isActive, color = 'burger', onClick }: CategoryButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300',
        'hover:scale-105 active:scale-95',
        isActive
          ? 'gradient-burger text-primary-foreground shadow-lg'
          : 'bg-card text-foreground hover:bg-muted border border-border'
      )}
    >
      <CategoryIcon name={icon} className="w-5 h-5" />
      <span className="hidden sm:inline">{name}</span>
    </button>
  );
};

export default CategoryButton;
