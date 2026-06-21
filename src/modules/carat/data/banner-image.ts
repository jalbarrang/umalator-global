import type { TimelineEvent } from './timeline-types';

const UMA_MOE_ASSET_ORIGIN = 'https://uma.moe';

export function bannerImageUrl(event: TimelineEvent): string {
  if (event.image_path) {
    return `${UMA_MOE_ASSET_ORIGIN}/${event.image_path.replace(/^\/+/, '')}`;
  }

  const label =
    event.card_type === 'support' ? 'Support' : event.card_type === 'character' ? 'Uma' : 'Event';

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 120"><rect width="184" height="120" rx="14" fill="#ece5d8"/><text x="92" y="66" text-anchor="middle" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#7d6b56">${label}</text></svg>`
  )}`;
}
