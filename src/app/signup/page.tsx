import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession, googleEnabled } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { isDatabaseConfigured } from "@/lib/mongodb";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  if ((await getSession())?.user) redirect("/app");
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. Your images still never leave your device."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-fg underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Suspense>
        <AuthForm mode="signup" googleEnabled={googleEnabled} dbReady={isDatabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
