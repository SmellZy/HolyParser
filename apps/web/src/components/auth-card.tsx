import Link from "next/link";

import { Icon } from "./icon";

export function AuthCard({
  children,
  description,
  footer,
  title,
}: {
  children: React.ReactNode;
  description: string;
  footer: React.ReactNode;
  title: string;
}) {
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="zap" size={17} />
        </span>
        <span>Arbitrage</span>
      </Link>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-icon" aria-hidden="true">
          <Icon name="lock" size={21} />
        </div>
        <p className="eyebrow">Account foundation</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>

        <div className="prototype-notice" id="prototype-notice" role="status">
          Layout preview only. Authentication is not connected in Phase 1.
        </div>

        {children}

        <div className="auth-footer">{footer}</div>
      </section>
    </main>
  );
}
