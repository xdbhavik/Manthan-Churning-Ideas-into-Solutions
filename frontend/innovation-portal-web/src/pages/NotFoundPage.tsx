import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl font-headline font-bold text-navy-900">404</div>
      <p className="mt-2 text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-bold">
        Back to Home
      </Link>
    </div>
  );
}
