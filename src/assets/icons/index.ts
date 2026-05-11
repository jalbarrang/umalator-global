import { config } from '@/config';

export function getIconUrl(path: string): string {
  const baseUrl = config.baseUrl;

  return `${baseUrl}/icons/${path}`;
}
