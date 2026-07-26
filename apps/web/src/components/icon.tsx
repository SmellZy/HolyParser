const iconPaths = {
  activity: <path d="M3 12h4l2.2-6 3.4 12 2.2-6H21" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  braces: (
    <>
      <path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2" />
      <path d="M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2" />
    </>
  ),
  calculator: (
    <>
      <rect height="20" rx="2" width="16" x="4" y="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 3 3 5-7" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  container: (
    <>
      <path d="m7.5 4.3 4.5-2.6 4.5 2.6v5.2L12 12.1 7.5 9.5Z" />
      <path d="m3 14.5 4.5-2.6 4.5 2.6v5.2l-4.5 2.6L3 19.7ZM12 14.5l4.5-2.6 4.5 2.6v5.2l-4.5 2.6-4.5-2.6Z" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </>
  ),
  dashboard: (
    <>
      <rect height="8" rx="1" width="8" x="3" y="3" />
      <rect height="8" rx="1" width="8" x="13" y="3" />
      <rect height="8" rx="1" width="8" x="3" y="13" />
      <rect height="8" rx="1" width="8" x="13" y="13" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M8 15h8" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  matrix: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  panel: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M9 3v18M13 8h4M13 12h4M13 16h4" />
    </>
  ),
  scanner: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M8 11h6M11 8v6" />
    </>
  ),
  server: (
    <>
      <rect height="7" rx="2" width="18" x="3" y="3" />
      <rect height="7" rx="2" width="18" x="3" y="14" />
      <path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" />,
  sparkles: (
    <path d="m12 3-1.2 3.4L7.5 7.5l3.3 1.2L12 12l1.2-3.3 3.3-1.2-3.3-1.1ZM5 14l-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8ZM19 13l-.7 1.8-1.8.7 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.7Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 5h14a2 2 0 0 1 2 2v13H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M16 10h6v5h-6a2.5 2.5 0 0 1 0-5ZM5 5V3h11v2" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9Z" />,
} as const;

export type IconName = keyof typeof iconPaths;

export function Icon({
  className,
  label,
  name,
  size = 18,
}: {
  className?: string;
  label?: string;
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      className={className}
      fill="none"
      height={size}
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}
