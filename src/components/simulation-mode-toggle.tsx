import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Link, useLocation } from '@tanstack/react-router';

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
          asChild
          className={cn({
            'bg-primary!': isActive('/'),
          })}
        >
          <Link to="/">Compare Runners</Link>
        </Button>

        <Button
          variant="outline"
          asChild
          className={cn({
            'bg-primary!': isActive('/skill-bassin'),
          })}
        >
          <Link to="/skill-bassin">Skill Chart</Link>
        </Button>

        <Button
          variant="outline"
          asChild
          className={cn({
            'bg-primary!': isActive('/uma-bassin'),
          })}
        >
          <Link to="/uma-bassin">Uma Chart</Link>
        </Button>
      </ButtonGroup>
    </div>
  );
};
