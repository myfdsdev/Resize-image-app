import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession, googleEnabled } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { isDatabaseConfigured } from "@/lib/mongodb";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if ((await getSession())?.user) redirect("/app");
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to save your presets and settings."
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="text-fg underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense>
        <AuthForm mode="login" googleEnabled={googleEnabled} dbReady={isDatabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
