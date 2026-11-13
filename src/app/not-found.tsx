import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
      <ButtonLink href="/" className="mt-6">
        Back home
      </ButtonLink>
    </main>
  );
}
