/** Portable JSON format for exporting/importing recipes between installs. */

export const RECIPE_EXPORT_FORMAT = 'my-receipe-book.recipes';
export const RECIPE_EXPORT_VERSION = 1;

export type ExportIngredient = {
  name: string;
  amount: number;
  unit: string;
};

export type ExportRecipe = {
  title: string;
  description?: string;
  ingredients: ExportIngredient[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

export type RecipeExportFile = {
  format: typeof RECIPE_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  recipes: ExportRecipe[];
};

type SourceRecipe = {
  title: string;
  description?: string;
  ingredients?: { name?: string; amount?: number; unit?: string }[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

/** Strips ids/ownership/timestamps so the file is portable across accounts. */
export function toExportRecipe(recipe: SourceRecipe): ExportRecipe {
  return {
    title: recipe.title,
    ...(recipe.description ? { description: recipe.description } : {}),
    ingredients: (recipe.ingredients ?? []).map((ing) => ({
      name: ing.name ?? '',
      amount: ing.amount ?? 0,
      unit: ing.unit ?? '',
    })),
    instructions: recipe.instructions ?? [],
    ...(recipe.prepTime != null ? { prepTime: recipe.prepTime } : {}),
    ...(recipe.cookTime != null ? { cookTime: recipe.cookTime } : {}),
    ...(recipe.servings != null ? { servings: recipe.servings } : {}),
    ...(recipe.tags && recipe.tags.length > 0 ? { tags: recipe.tags } : {}),
  };
}

export function buildExportFile(recipes: SourceRecipe[]): RecipeExportFile {
  return {
    format: RECIPE_EXPORT_FORMAT,
    version: RECIPE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: recipes.map(toExportRecipe),
  };
}

/** Turns a title into a safe, readable filename stem. */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'recipe';
}

export function downloadRecipeExport(recipes: SourceRecipe[], filenameStem: string): void {
  const payload = buildExportFile(recipes);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameStem}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
