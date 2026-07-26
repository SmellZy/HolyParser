export function EmailField() {
  return (
    <label className="field">
      <span>Email address</span>
      <input
        autoComplete="email"
        inputMode="email"
        name="email"
        placeholder="you@example.com"
        type="email"
      />
    </label>
  );
}

export function PasswordField({
  autoComplete,
  label = "Password",
}: {
  autoComplete: "current-password" | "new-password";
  label?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        name={label.toLowerCase().replaceAll(" ", "-")}
        placeholder="••••••••••••"
        type="password"
      />
    </label>
  );
}

export function PreviewSubmit({ children }: { children: React.ReactNode }) {
  return (
    <button
      aria-describedby="prototype-notice"
      className="primary-button"
      disabled
      type="submit"
    >
      {children}
    </button>
  );
}
