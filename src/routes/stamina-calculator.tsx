import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/stamina-calculator')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/stamina-calculator"!</div>;
}
