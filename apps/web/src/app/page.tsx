import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icon";

const foundationCards: ReadonlyArray<{
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tone: "positive" | "info" | "warning";
}> = [
  {
    label: "Web shell",
    value: "Ready",
    detail: "Responsive navigation and design tokens",
    icon: "activity",
    tone: "positive",
  },
  {
    label: "Control API",
    value: "Foundation",
    detail: "Health contracts only",
    icon: "server",
    tone: "info",
  },
  {
    label: "Local data",
    value: "Configured",
    detail: "PostgreSQL and Redis via Docker",
    icon: "database",
    tone: "warning",
  },
] as const;

const nextBoundaries: ReadonlyArray<{
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    title: "No exchange connections",
    description:
      "Public and private exchange integrations are intentionally absent.",
    icon: "container",
  },
  {
    title: "No financial execution",
    description:
      "Trading, API-key storage, risk, and execution paths do not exist.",
    icon: "shield",
  },
  {
    title: "Contracts first",
    description:
      "The shared package currently exposes only the versioned health contract.",
    icon: "braces",
  },
] as const;

export default function Home() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Foundation environment</p>
          <h1>Platform overview</h1>
          <p className="page-description">
            A safe application shell for the read-only analytics phases that
            follow.
          </p>
        </div>
        <span className="status-pill" data-tone="mock">
          Mock data
        </span>
      </header>

      <section aria-labelledby="foundation-status">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Phase 1</p>
            <h2 id="foundation-status">Foundation status</h2>
          </div>
          <p>Updated from local configuration</p>
        </div>

        <div className="status-grid">
          {foundationCards.map((card) => {
            return (
              <article className="status-card" key={card.label}>
                <div className="status-card-icon" data-tone={card.tone}>
                  <Icon name={card.icon} size={19} />
                </div>
                <div>
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.detail}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="boundary-panel" aria-labelledby="scope-boundaries">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Safety boundary</p>
            <h2 id="scope-boundaries">What this build deliberately excludes</h2>
          </div>
        </div>

        <div className="boundary-list">
          {nextBoundaries.map((boundary) => {
            return (
              <article key={boundary.title}>
                <Icon name={boundary.icon} />
                <div>
                  <h3>{boundary.title}</h3>
                  <p>{boundary.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
