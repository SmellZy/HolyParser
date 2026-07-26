import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import {
  EmailField,
  PasswordField,
  PreviewSubmit,
} from "@/components/auth-fields";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <AuthCard
      description="Create the account that will later hold your read-only workspace settings."
      footer={
        <p>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      }
      title="Create your account"
    >
      <form className="auth-form">
        <EmailField />
        <PasswordField autoComplete="new-password" />
        <PasswordField autoComplete="new-password" label="Confirm password" />
        <label className="checkbox-field terms-field">
          <input name="accept-terms" type="checkbox" />
          <span>I acknowledge the terms and risk disclosures placeholder.</span>
        </label>
        <PreviewSubmit>Create account</PreviewSubmit>
      </form>
    </AuthCard>
  );
}
