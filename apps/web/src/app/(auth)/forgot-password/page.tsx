import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { EmailField, PreviewSubmit } from "@/components/auth-fields";

export const metadata: Metadata = {
  title: "Recover account",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      description="Enter your email to request a single-use recovery link."
      footer={<Link href="/login">Return to sign in</Link>}
      title="Recover your account"
    >
      <form className="auth-form">
        <EmailField />
        <PreviewSubmit>Send recovery link</PreviewSubmit>
      </form>
    </AuthCard>
  );
}
