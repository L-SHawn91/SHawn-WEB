// i18n-exempt: redirect-only route; no user-facing copy.
import { redirect } from "next/navigation";

export default function DashboardPageWrapper() {
  redirect("/papers");
}
