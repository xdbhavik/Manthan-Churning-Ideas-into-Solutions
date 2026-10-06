import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/problems', label: 'Problems' },
  { to: '/#how', label: 'How it Works', hash: 'how' },
  { to: '/#about', label: 'About', hash: 'about' },
];

export function MarketingNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const goToHash = (hash: string) => {
    setOpen(false);
    navigate(`/#${hash}`);
    // Scroll after navigation settles.
    setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-card/90 backdrop-blur border-b border-hairline tricolor-border-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Portal logo" className="w-8 h-8" />
          <div className="leading-tight">
            <div className="font-headline font-bold text-navy-900 text-sm">National Innovation Portal</div>
            <div className="text-[11px] text-muted">Government of India</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/problems"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'text-navy-900 bg-surface' : 'text-muted hover:text-body hover:bg-surface'
              }`
            }
          >
            Problems
          </NavLink>
          <button
            onClick={() => goToHash('how')}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:text-body hover:bg-surface transition-colors"
          >
            How it Works
          </button>
          <button
            onClick={() => goToHash('about')}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:text-body hover:bg-surface transition-colors"
          >
            About
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-3 py-2 rounded-lg text-sm font-semibold text-navy-900 hover:bg-surface transition-colors"
          >
            Login
          </Link>
          <Link
            to="/login?mode=register"
            className="btn-sheen px-4 py-2 rounded-lg text-sm font-bold text-white bg-navy-900 hover:bg-navy-700 transition-colors"
          >
            Register
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-navy-900">{open ? 'close' : 'menu'}</span>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-hairline bg-card px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) =>
            l.hash ? (
              <button
                key={l.label}
                onClick={() => goToHash(l.hash)}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:bg-surface"
              >
                {l.label}
              </button>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:bg-surface"
              >
                {l.label}
              </Link>
            )
          )}
          <div className="pt-2 flex gap-2">
            <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-semibold text-navy-900 bg-surface">
              Login
            </Link>
            <Link to="/login?mode=register" onClick={() => setOpen(false)} className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-bold text-white bg-navy-900">
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
