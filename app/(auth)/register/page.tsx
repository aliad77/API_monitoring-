import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 mb-6 text-sm text-haze-500 dark:text-haze-400">
        Start monitoring your websites and APIs.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-haze-500 dark:text-haze-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-lavender-deep underline-offset-4 hover:underline dark:text-lavender"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
