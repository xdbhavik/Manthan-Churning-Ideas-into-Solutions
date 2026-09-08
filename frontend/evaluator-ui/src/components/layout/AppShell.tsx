import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex antialiased">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen w-full">
        <Header />
        <div className="h-16 shrink-0" />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
