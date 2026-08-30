"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function updatePracticeSettings(input: {
  kashrutEnabled: boolean;
  jewishCalendarEnabled: boolean;
}) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      kashrut_enabled: input.kashrutEnabled === true,
      jewish_calendar_enabled: input.jewishCalendarEnabled === true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/profil");
  revalidatePath("/planning");
  revalidatePath("/journal");
  return { ok: true as const };
}

export async function updateCalendarSettings(input: {
  city: string;
  israelCalendar: boolean;
  minorFasts: boolean;
  kitniyot: boolean;
  noFishWithMeat: boolean;
  candleOffsetMin: number;
}) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const city = input.city.trim().slice(0, 60);
  const offset = [18, 20, 30, 40].includes(input.candleOffsetMin)
    ? input.candleOffsetMin
    : 18;

  const [settingsRes, profileRes] = await Promise.all([
    supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        israel_calendar: input.israelCalendar === true,
        minor_fasts: input.minorFasts === true,
        kitniyot: input.kitniyot === true,
        no_fish_with_meat: input.noFishWithMeat === true,
        candle_offset_min: offset,
      },
      { onConflict: "user_id" },
    ),
    supabase
      .from("profiles")
      .update({ city: city.length > 0 ? city : null })
      .eq("id", user.id),
  ]);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (profileRes.error) throw new Error(profileRes.error.message);
  revalidatePath("/profil");
  revalidatePath("/planning");
  revalidatePath("/journal");
  return { ok: true as const };
}

export async function updateProfileVisibility(publicProfile: boolean) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ visibility: publicProfile === true ? "public" : "private" })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profil");
  revalidatePath("/communaute");
  return { ok: true as const };
}

export async function deleteAccountData() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS restricts every delete to the current user's rows.
  await supabase.from("food_logs").delete().eq("user_id", user.id);
  await supabase.from("food_favorites").delete().eq("user_id", user.id);
  await supabase.from("weight_logs").delete().eq("user_id", user.id);
  await supabase.from("goals").delete().eq("user_id", user.id);
  await supabase.from("health_profile").delete().eq("user_id", user.id);
  await supabase.from("user_settings").delete().eq("user_id", user.id);
  await supabase.from("foods").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
