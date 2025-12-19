import { createRouter } from '@tanstack/react-router';
import './i18n';

import { routeTree } from './routeTree.gen';
import { enableMapSet } from 'immer';

enableMapSet();

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  });

  return router;
}
