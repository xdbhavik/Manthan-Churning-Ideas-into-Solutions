export function Footer() {
  return (
    <footer className="border-t border-hairline bg-card mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Portal logo" className="w-8 h-8" />
              <div className="font-headline font-bold text-navy-900">National Innovation Portal</div>
            </div>
            <p className="mt-3 text-sm text-muted">
              Government of India · Smart India Hackathon. Browse national problem statements, form
              teams, and submit solutions for evaluation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="font-semibold text-body">Portal</div>
              <ul className="mt-3 space-y-2 text-muted">
                <li>Problems</li>
                <li>How it Works</li>
                <li>About</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-body">Account</div>
              <ul className="mt-3 space-y-2 text-muted">
                <li>Login</li>
                <li>Register</li>
                <li>Support</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="tricolor-stripe-animated h-1 rounded-full mt-8 mb-6" />
        <div className="text-xs text-muted">
          © {new Date().getFullYear()} Ministry of Education, Government of India. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
