import { redirect } from "next/navigation";

/** The account page now lives inside the dashboard. */
export default function LegacyAccountPage() {
  redirect("/app/account");
}
