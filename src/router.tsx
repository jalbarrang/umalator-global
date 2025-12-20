import { createRouter } from '@tanstack/react-router';
import './i18n';

import { enableMapSet } from 'immer';
import { routeTree } from './routeTree.gen';

enableMapSet();

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  });

  return router;
}
