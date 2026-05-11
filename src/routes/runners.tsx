import { Suspense } from 'react';
import { Outlet } from 'react-router';

export function RunnersLayout() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
            Loading route…
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
