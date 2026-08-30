import { redirect } from "next/navigation";

import { BottomNav } from "@/components/ui/bottom-nav";
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
    <div className="mx-auto min-h-dvh max-w-lg">
      <main className="px-4 pb-28 pt-8">{children}</main>
      <BottomNav />
    </div>
  );
}
