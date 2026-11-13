import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-muted sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Privacy Policy</h1>
        <p>
          <strong className="text-fg">Your images stay on your device.</strong> PixForge resizes, converts and
          compresses images inside your web browser. Images you add are never uploaded to our servers and are removed
          from memory when you close or leave the page.
        </p>
        <h2 className="pt-4 text-lg font-medium text-fg">Account data</h2>
        <p>
          If you create an account, we store your name, email address, a securely hashed password (or your Google
          account identifier) and your saved settings. We do not sell this data.
        </p>
        <h2 className="pt-4 text-lg font-medium text-fg">AI features (coming soon)</h2>
        <p>
          AI tools will use your own API key. When you run an AI tool, only the image you choose is sent to the AI
          provider to perform that task. You will always be told before this happens.
        </p>
        <h2 className="pt-4 text-lg font-medium text-fg">Metadata</h2>
        <p>Exported images do not include EXIF metadata such as GPS location or camera details.</p>
        <h2 className="pt-4 text-lg font-medium text-fg">Contact</h2>
        <p>For any privacy question, contact the PixForge team through the website.</p>
      </main>
      <SiteFooter />
    </>
  );
}
