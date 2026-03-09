import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';

const items = [
  { path: '/', label: 'Compare Runners' },
  { path: '/skill-bassin', label: 'Skill Chart' },
  { path: '/uma-bassin', label: 'Uma Chart' },
];

export const SimulationModeToggle = () => {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-1 w-full border-b border-border">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            draggable={false}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:transition-opacity',
              active ? 'after:bg-primary after:opacity-100' : 'after:opacity-0',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
