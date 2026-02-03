import { Link, useLocation } from 'react-router';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ButtonGroup } from '@/components/ui/button-group';

export const SimulationModeToggle = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex justify-center items-center gap-2">
      <ButtonGroup>
        <Button
          variant="outline"
          className={cn({
            'bg-primary!': isActive('/'),
            'text-primary-foreground!': isActive('/'),
          })}
        >
          <Link to="/">Compare Runners</Link>
        </Button>

        <Button
          variant="outline"
          className={cn({
            'bg-primary!': isActive('/skill-bassin'),
            'text-primary-foreground!': isActive('/skill-bassin'),
          })}
        >
          <Link to="/skill-bassin">Skill Chart</Link>
        </Button>

        <Button
          variant="outline"
          className={cn({
            'bg-primary!': isActive('/uma-bassin'),
            'text-primary-foreground!': isActive('/uma-bassin'),
          })}
        >
          <Link to="/uma-bassin">Uma Chart</Link>
        </Button>
      </ButtonGroup>
    </div>
  );
};
