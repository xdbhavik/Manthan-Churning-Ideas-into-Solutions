import { Link } from 'react-router-dom';

export function SignInPrompt({
  title = 'Sign in to continue',
  message = 'This section of the portal requires a verified account.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-card border border-hairline flex items-center justify-center mx-auto shadow-sm">
        <span className="material-symbols-outlined text-navy-900 text-2xl">lock</span>
      </div>
      <h2 className="font-headline text-xl font-bold text-navy-900 mt-5">{title}</h2>
      <p className="text-muted mt-2">{message}</p>
      <Link
        to="/login"
        className="btn-sheen mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-900 text-white px-5 py-2.5 text-sm font-bold"
      >
        Sign in <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    </div>
  );
}
