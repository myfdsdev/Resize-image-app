import { getSession } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session?.user ? { name: session.user.name ?? null, email: session.user.email ?? null } : null;
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
