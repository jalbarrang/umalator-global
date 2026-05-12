import { config } from '@/config';

export function getIconUrl(path: string): string {
  return `${config.basePath}icons/${path}`;
}
