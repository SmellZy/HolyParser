import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import {
  EmailField,
  PasswordField,
  PreviewSubmit,
} from "@/components/auth-fields";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard
      description="Use your account to access the analytics workspace."
      footer={
        <p>
          New to the platform? <Link href="/register">Create an account</Link>
        </p>
      }
      title="Welcome back"
    >
      <form className="auth-form">
        <EmailField />
        <PasswordField autoComplete="current-password" />
        <div className="form-support">
          <label className="checkbox-field">
            <input name="remember-device" type="checkbox" />
            <span>Remember this device</span>
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <PreviewSubmit>Sign in</PreviewSubmit>
      </form>
    </AuthCard>
  );
}
