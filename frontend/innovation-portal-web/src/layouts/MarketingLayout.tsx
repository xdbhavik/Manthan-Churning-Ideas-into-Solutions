import { Outlet } from 'react-router-dom';
import { MarketingNav } from '../components/layout/MarketingNav';
import { Footer } from '../components/layout/Footer';

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNav />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
