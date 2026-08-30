import { redirect } from "next/navigation";

import { BottomNav } from "@/components/ui/bottom-nav";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed_at) redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-dvh lg:flex">
      <SidebarNav />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
