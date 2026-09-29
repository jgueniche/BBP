"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  // The service is refused under 16 (brief §9): a declaration, no birth date kept.
  isSixteenOrOlder: z.literal(true),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(raw: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: parsed.data.displayName,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  // Cooking rules stay off until the person opts in (Moi › Mes règles).
  await supabase
    .from("user_settings")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  redirect("/recettes");
}
