import {
  RecipeEditor,
  emptyEditorInitial,
} from "@/components/recipes/recipe-editor";
import { fr } from "@/i18n/fr";

export default function NewRecipePage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.recettes.editorTitleNew}
      </h1>
      <RecipeEditor initial={emptyEditorInitial} />
    </section>
  );
}
