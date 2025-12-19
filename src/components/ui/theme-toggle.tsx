import React from 'react';
import { SunIcon, MoonIcon } from 'lucide-react';
import { useThemeStore } from '@/providers/theme/context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme } = useThemeStore((state) => state);

  const handleToggle = () => {
    switch (theme) {
      case 'light':
        setTheme('dark');
        break;
      case 'dark':
        setTheme('light');
        break;
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-4 w-4" />;
      case 'dark':
        return <MoonIcon className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to system theme';
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      aria-label={getLabel()}
      title={getLabel()}
      className={cn('flex h-9 w-9 items-center justify-center', className)}
    >
      {getIcon()}
    </Button>
  );
};
