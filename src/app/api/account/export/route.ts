import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// RGPD self-service export: everything the person created in the app, as
// JSON. RLS scopes each read to what the account owns or can see.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [
    profile,
    settings,
    recipes,
    notes,
    comments,
    collections,
    posts,
    postComments,
    conversations,
    messages,
    memories,
    plans,
    tipVotes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase
      .from("recipes")
      .select("*, recipe_ingredients(*), recipe_steps(*)")
      .eq("author_id", user.id),
    supabase.from("recipe_notes").select("*").eq("user_id", user.id),
    supabase.from("recipe_comments").select("*").eq("user_id", user.id),
    supabase
      .from("collections")
      .select("*, collection_recipes(recipe_id)")
      .eq("owner_id", user.id),
    supabase.from("posts").select("*").eq("author_id", user.id),
    supabase.from("post_comments").select("*").eq("author_id", user.id),
    supabase.from("coach_conversations").select("*").eq("user_id", user.id),
    supabase.from("coach_messages").select("*").eq("user_id", user.id),
    supabase.from("coach_memories").select("*").eq("user_id", user.id),
    supabase
      .from("meal_plans")
      .select("*, meal_plan_slots(*)")
      .eq("user_id", user.id),
    supabase.from("recipe_comment_votes").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data,
    user_settings: settings.data,
    recipes: recipes.data,
    recipe_notes: notes.data,
    recipe_comments: comments.data,
    collections: collections.data,
    posts: posts.data,
    post_comments: postComments.data,
    assistant_conversations: conversations.data,
    assistant_messages: messages.data,
    assistant_memories: memories.data,
    meal_plans: plans.data,
    tip_votes: tipVotes.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="copine-en-cuisine-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
