import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Sign in to Pulse
      </h1>
      <p className="mt-1 mb-6 text-sm text-haze-500 dark:text-haze-400">
        Welcome back. Enter your details to continue.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-haze-500 dark:text-haze-400">
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-lavender-deep underline-offset-4 hover:underline dark:text-lavender"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
