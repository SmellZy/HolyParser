import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This route is not part of the current foundation scope.</p>
        <Link className="button-link" href="/">
          Return to overview
        </Link>
      </div>
    </main>
  );
}
