import 'intl-pluralrules';

import './styles.css';
import './app.css';

import { createRoot } from 'react-dom/client';
import './i18n';

import { App } from './App';
import { Toaster } from './components/ui/sonner';

const container = document.getElementById('app');
const root = createRoot(container!);

root.render(
  <>
    <App />
    <Toaster />
  </>,
);
