import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { PreviewSubmit } from "@/components/auth-fields";

export const metadata: Metadata = {
  title: "Verify email",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      description="Enter the six-digit code sent to your email address."
      footer={
        <p>
          Wrong address? <Link href="/register">Start again</Link>
        </p>
      }
      title="Verify your email"
    >
      <form className="auth-form">
        <label className="field">
          <span>Verification code</span>
          <input
            autoComplete="one-time-code"
            className="code-input"
            inputMode="numeric"
            maxLength={6}
            name="verification-code"
            pattern="[0-9]{6}"
            placeholder="000000"
          />
        </label>
        <PreviewSubmit>Verify email</PreviewSubmit>
      </form>
    </AuthCard>
  );
}
