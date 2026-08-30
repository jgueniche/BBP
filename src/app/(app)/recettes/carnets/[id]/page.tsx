import { notFound, redirect } from "next/navigation";

import { IlluCouscoussier } from "@/components/illustrations";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { CollectionActionsBar } from "./collection-actions-bar";

const t = fr.recettes.collections;

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!collection) notFound();

  const isOwner = collection.owner_id === user.id;

  const [{ data: links }, { count: memberCount }] = await Promise.all([
    supabase
      .from("collection_recipes")
      .select("recipe_id, created_at")
      .eq("collection_id", collection.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collection_members")
      .select("user_id", { count: "exact", head: true })
      .eq("collection_id", collection.id),
  ]);

  const recipeIds = (links ?? []).map((l) => l.recipe_id);
  const { data: recipes } =
    recipeIds.length > 0
      ? await supabase
          .from("recipes")
          .select(
            "id, title, slug, icon, origin, kashrut_class, is_fish, prep_min, cook_min, version_kind",
          )
          .in("id", recipeIds)
      : { data: [] };
  const byId = new Map((recipes ?? []).map((r) => [r.id, r]));
  const ordered = recipeIds
    .map((rid) => byId.get(rid))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  const members = memberCount ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none" aria-hidden>
            {collection.icon}
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {collection.name}
            </h1>
            <p className="text-xs text-ink-50">
              {ordered.length}{" "}
              {ordered.length === 1 ? t.recipeLabel : t.recipesLabel}
              {isOwner && members > 0 && (
                <>
                  {" · "}
                  {members} {members === 1 ? t.memberLabel : t.membersLabel}
                </>
              )}
            </p>
          </div>
        </div>
        {collection.description && (
          <p className="text-sm text-ink-70">{collection.description}</p>
        )}
        <CollectionActionsBar collection={collection} isOwner={isOwner} />
      </header>

      {ordered.length === 0 ? (
        <EmptyState
          illustration={<IlluCouscoussier size={64} />}
          title={t.emptyDetail}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {ordered.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe as RecipeCardData} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
