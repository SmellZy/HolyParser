"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="state-page">
      <div className="state-card" role="alert">
        <p className="eyebrow">Application error</p>
        <h1>Something went wrong</h1>
        <p>The foundation shell could not render this page.</p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}
