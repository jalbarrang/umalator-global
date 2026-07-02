import React from 'react';
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react';
import { useThemeStore } from '@/providers/theme/context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme } = useThemeStore((state) => state);

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="size-4" />;
      case 'dark':
        return <MoonIcon className="size-4" />;
      case 'system':
        return <MonitorIcon className="size-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to system theme';
      case 'system':
        return 'Switch to light mode';
    }
  };

  return (
    <Button
      variant="outline"
      onClick={toggleTheme}
      aria-label={getLabel()}
      title={getLabel()}
      className={cn('flex size-9 items-center justify-center', className)}
    >
      {getIcon()}
    </Button>
  );
};
