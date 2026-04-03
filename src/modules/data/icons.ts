import { getIconUrl } from '@/assets/icons';
import rawIcons from './icons.json';

type IconMap = typeof rawIcons;

export const icons = Object.fromEntries(
  Object.entries(rawIcons).map(([id, path]) => [id, getIconUrl(path)]),
) as IconMap;

export function getIconById(id: string | number): string | undefined {
  return icons[String(id) as keyof IconMap];
}
