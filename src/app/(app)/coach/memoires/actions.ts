"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export async function deleteMemory(id: string) {
  const memoryId = z.uuid().parse(id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("coach_memories").delete().eq("id", memoryId);
  revalidatePath("/coach/memoires");
}
