import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background page-enter">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
