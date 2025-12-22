import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/runners')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
