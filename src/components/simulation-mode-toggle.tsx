import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Link, useLocation } from 'react-router';

export const SimulationModeToggle = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        asChild
        className={cn({
          'bg-secondary!': isActive('/'),
        })}
      >
        <Link to="/">Compare Runners</Link>
      </Button>

      <Button
        variant="outline"
        asChild
        className={cn({
          'bg-secondary!': isActive('/skill-bassin'),
        })}
      >
        <Link to="/skill-bassin">Skill Chart</Link>
      </Button>

      <Button
        variant="outline"
        asChild
        className={cn({
          'bg-secondary!': isActive('/uma-bassin'),
        })}
      >
        <Link to="/uma-bassin">Uma Chart</Link>
      </Button>
    </ButtonGroup>
  );
};
