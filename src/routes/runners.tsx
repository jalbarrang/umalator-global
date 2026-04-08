import { Outlet } from 'react-router';

export function RunnersLayout() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Outlet />
    </div>
  );
}
