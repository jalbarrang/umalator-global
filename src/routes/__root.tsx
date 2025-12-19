// src/routes/__root.tsx
/// <reference types="vite/client" />

import stylesCss from '../styles.css?url';
import appCss from '../app.css?url';

import type { ReactNode } from 'react';
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
  useLocation,
} from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HeartIcon, ScrollTextIcon } from 'lucide-react';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangelogModal } from '@/components/changelog-modal';
import { CreditsModal } from '@/components/credits-modal';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Umalator - Global',
      },
    ],
    links: [
      { rel: 'stylesheet', href: stylesCss },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = location.pathname.startsWith('/runners')
    ? 'runners'
    : 'simulation';

  return (
    <RootDocument>
      <div className="flex flex-col min-h-screen">
        <div className="flex py-2 justify-between items-center border-b px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Tabs
              value={currentTab}
              onValueChange={(value) => {
                if (value === 'simulation') {
                  navigate({ to: '/' });
                } else if (value === 'runners') {
                  navigate({ to: '/runners' });
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="simulation">Umalator</TabsTrigger>
                <TabsTrigger value="runners">Veterans</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangelogModal(true)}
            >
              <ScrollTextIcon className="h-4 w-4 mr-1" />
              <span className="hidden md:inline!">Changelog</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreditsModal(true)}
            >
              <HeartIcon className="h-4 w-4 mr-1" />
              <span className="hidden md:inline!">Credits</span>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/jalbarrang/umalator-global"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="h-4 w-4 fill-accent-foreground" />
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <main className="flex flex-1 overflow-hidden min-h-0">
          <Outlet />
        </main>

        <CreditsModal />
        <ChangelogModal />
      </div>
      <Toaster />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

type GithubIconProps = React.SVGProps<SVGSVGElement>;

const GithubIcon = (props: GithubIconProps) => {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
};

function NotFoundComponent() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex gap-2 justify-center pt-4">
          <Button onClick={() => navigate({ to: '/' })}>Go to Umalator</Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/runners' })}
          >
            Go to Veterans
          </Button>
        </div>
      </div>
    </div>
  );
}
