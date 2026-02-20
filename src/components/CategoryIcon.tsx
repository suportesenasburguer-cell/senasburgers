import { lazy, Suspense } from 'react';
import { LucideProps, icons } from 'lucide-react';

interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
}

const CategoryIcon = ({ name, ...props }: CategoryIconProps) => {
  // Map icon name (kebab-case) to PascalCase component name
  const pascalName = name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') as keyof typeof icons;

  const IconComponent = icons[pascalName];

  if (!IconComponent) {
    const Fallback = icons['Utensils'];
    return <Fallback {...props} />;
  }

  return <IconComponent {...props} />;
};

export default CategoryIcon;
