import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/runners')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
