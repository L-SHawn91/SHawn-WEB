// i18n-exempt: internal admin redirect only; no public-facing copy.
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/admin/blog");
}
