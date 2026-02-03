import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import './i18n';

import { enableMapSet } from 'immer';
import { ThemeStoreProvider } from './providers/theme/provider';
import { RootComponent } from './routes/root';

enableMapSet();

const rootComponent = document.getElementById('root');

if (!rootComponent) {
  throw new Error('Root element not found');
}

const root = createRoot(rootComponent);
root.render(
  <HashRouter>
    <ThemeStoreProvider>
      <RootComponent />
    </ThemeStoreProvider>
  </HashRouter>,
);
