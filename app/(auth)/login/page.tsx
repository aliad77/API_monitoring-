import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Pulse</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Welcome back. Enter your details to continue.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
          Create one
        </Link>
      </p>
    </>
  );
}
