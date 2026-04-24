import { Footer } from "@/components/ui/footer";
import type { DashboardProject } from "@/lib/dashboard-data";
import { getDashboardProjects } from "@/lib/dashboard-data";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPageWrapper() {
  const projects: DashboardProject[] = await getDashboardProjects();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_25%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_25%),linear-gradient(180deg,#050816_0%,#090f1f_100%)] text-white">
      <DashboardClient projects={projects} />
      <Footer />
    </div>
  );
}
