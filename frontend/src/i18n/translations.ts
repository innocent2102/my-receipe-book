export const locales = ['pl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = 'pl';

export const localeNames: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
};

const en = {
  'common.appName': 'My Recipe Book',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting…',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.importing': 'Importing…',
  'common.login': 'Login',
  'common.signOut': 'Sign Out',

  'language.label': 'Language',

  'theme.toLight': 'Switch to light mode',
  'theme.toDark': 'Switch to dark mode',

  'home.welcomeBack': 'Welcome back, {name}!',
  'home.welcome': 'Welcome to Your Recipe Book',
  'home.tagline':
    'Create and save your own recipes, access your favorites instantly, and generate grocery lists in seconds.',
  'home.addRecipe': 'Add Recipe',
  'home.viewRecipes': 'View Recipes',
  'home.signInPrompt': 'Please sign in to get started',

  'login.title': 'Welcome Back',
  'login.subtitle': 'Sign in to access your recipes and grocery lists',
  'login.signInWithGoogle': 'Sign in with Google',
  'login.signingIn': 'Signing in...',
  'login.terms': 'By signing in, you agree to our Terms of Service and Privacy Policy',
  'login.notConfigured':
    'Google sign-in is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL and NEXTAUTH_SECRET to .env.local in the frontend folder. See frontend/GOOGLE_OAUTH_SETUP.md.',
  'login.errorNotConfigured':
    'Sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in frontend/.env.local (see frontend/GOOGLE_OAUTH_SETUP.md).',
  'login.errorGeneric': 'Failed to sign in. Please try again.',
  'login.errorDuringSignIn': 'An error occurred during sign in.',

  'recipes.title': 'My Recipes',
  'recipes.addRecipe': 'Add Recipe',
  'recipes.exportAll': 'Export all',
  'recipes.empty.title': 'No recipes yet',
  'recipes.empty.body':
    'Start building your recipe collection by adding your first recipe, or import a previously exported file.',
  'recipes.empty.cta': 'Create Your First Recipe',
  'recipes.empty.importCta': 'Import from file',
  'recipes.loadError': 'Could not load recipes',
  'recipes.loadErrorHelp':
    'Ensure the backend is running and BACKEND_URL in frontend/.env.local matches it (default http://localhost:3001). If you set RECIPES_PROXY_SECRET on the backend, use the same value in frontend/.env.local.',
  'recipes.deleteAria': 'Delete {title}',
  'recipes.editAria': 'Edit {title}',
  'recipes.delete.title': 'Delete recipe?',
  'recipes.delete.body': 'This will permanently remove “{title}” and cannot be undone.',
  'recipes.delete.notFound': 'Recipe not found or you no longer have access.',
  'recipes.delete.failed': 'Could not delete this recipe.',
  'recipes.delete.network':
    'Network error while deleting. Check that the app and API are running.',
  'recipes.chip.prep': 'Prep: {minutes} min',
  'recipes.chip.cook': 'Cook: {minutes} min',
  'recipes.chip.total': 'Total: {minutes} min',
  'recipes.chip.servings': 'Servings: {count}',
  'recipes.import.invalidJson': 'That file is not valid JSON.',
  'recipes.import.failed': 'Could not import that file.',
  'recipes.import.success.one': 'Imported {count} recipe.',
  'recipes.import.success.few': 'Imported {count} recipes.',
  'recipes.import.success.many': 'Imported {count} recipes.',
  'recipes.import.success.other': 'Imported {count} recipes.',
  'recipes.import.skipped.one': 'Skipped {count} recipe without a title.',
  'recipes.import.skipped.few': 'Skipped {count} recipes without a title.',
  'recipes.import.skipped.many': 'Skipped {count} recipes without a title.',
  'recipes.import.skipped.other': 'Skipped {count} recipes without a title.',

  'detail.title': 'Recipe',
  'detail.back': 'Back to recipes',
  'detail.ingredients': 'Ingredients',
  'detail.instructions': 'Instructions',
  'detail.noIngredients': 'No ingredients listed for this recipe.',
  'detail.notFound': 'Recipe not found or you no longer have access.',
  'detail.loadError': 'Could not load this recipe',

  'add.appBarTitle': 'Add New Recipe',
  'add.heading': 'Create New Recipe',
  'add.titleLabel': 'Recipe Title *',
  'add.descriptionLabel': 'Description',
  'add.descriptionPlaceholder': 'Describe your recipe...',
  'add.prepTime': 'Prep Time (minutes)',
  'add.cookTime': 'Cook Time (minutes)',
  'add.servings': 'Servings',
  'add.ingredients': 'Ingredients',
  'add.addIngredient': 'Add Ingredient',
  'add.amount': 'Amount',
  'add.unit': 'Unit',
  'add.unitPlaceholder': 'e.g., cups, tbsp, g',
  'add.ingredientName': 'Ingredient Name',
  'add.ingredientNamePlaceholder': 'Pick one or type a new ingredient',
  'add.instructions': 'Instructions',
  'add.addStep': 'Add Step',
  'add.stepPlaceholder': 'Step {number}...',
  'add.tags': 'Tags',
  'add.addTagLabel': 'Add Tag',
  'add.tagPlaceholder': 'e.g., vegetarian, quick, dessert',
  'add.save': 'Save Recipe',
  'add.saving': 'Saving...',
  'add.titleRequired': 'Recipe title is required',
  'add.saveFailedStatus': 'Failed to save recipe ({status})',
  'add.saveFailedGeneric': 'Failed to save recipe. Please try again.',
  'edit.appBarTitle': 'Edit Recipe',
  'edit.heading': 'Edit Recipe',
  'edit.save': 'Save Changes',
  'edit.saving': 'Saving…',
  'edit.saveFailedStatus': 'Failed to update recipe ({status})',
} as const;

export type TranslationKey = keyof typeof en;

const pl: Record<TranslationKey, string> = {
  'common.appName': 'Moja Książka Kucharska',
  'common.cancel': 'Anuluj',
  'common.delete': 'Usuń',
  'common.deleting': 'Usuwanie…',
  'common.add': 'Dodaj',
  'common.edit': 'Edytuj',
  'common.export': 'Eksportuj',
  'common.import': 'Importuj',
  'common.importing': 'Importowanie…',
  'common.login': 'Zaloguj',
  'common.signOut': 'Wyloguj się',

  'language.label': 'Język',

  'theme.toLight': 'Przełącz na tryb jasny',
  'theme.toDark': 'Przełącz na tryb ciemny',

  'home.welcomeBack': 'Witaj ponownie, {name}!',
  'home.welcome': 'Witaj w swojej książce kucharskiej',
  'home.tagline':
    'Twórz i zapisuj własne przepisy, błyskawicznie sięgaj po ulubione i w kilka sekund twórz listy zakupów.',
  'home.addRecipe': 'Dodaj przepis',
  'home.viewRecipes': 'Zobacz przepisy',
  'home.signInPrompt': 'Zaloguj się, aby rozpocząć',

  'login.title': 'Witaj ponownie',
  'login.subtitle': 'Zaloguj się, aby uzyskać dostęp do swoich przepisów i list zakupów',
  'login.signInWithGoogle': 'Zaloguj się przez Google',
  'login.signingIn': 'Logowanie…',
  'login.terms': 'Logując się, akceptujesz Regulamin oraz Politykę prywatności',
  'login.notConfigured':
    'Logowanie przez Google nie jest skonfigurowane. Dodaj GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL i NEXTAUTH_SECRET do pliku .env.local w folderze frontend. Zobacz frontend/GOOGLE_OAUTH_SETUP.md.',
  'login.errorNotConfigured':
    'Logowanie nie jest skonfigurowane. Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w frontend/.env.local (zobacz frontend/GOOGLE_OAUTH_SETUP.md).',
  'login.errorGeneric': 'Nie udało się zalogować. Spróbuj ponownie.',
  'login.errorDuringSignIn': 'Wystąpił błąd podczas logowania.',

  'recipes.title': 'Moje przepisy',
  'recipes.addRecipe': 'Dodaj przepis',
  'recipes.exportAll': 'Eksportuj wszystkie',
  'recipes.empty.title': 'Nie masz jeszcze przepisów',
  'recipes.empty.body':
    'Zacznij budować swoją kolekcję — dodaj pierwszy przepis lub zaimportuj wcześniej wyeksportowany plik.',
  'recipes.empty.cta': 'Dodaj pierwszy przepis',
  'recipes.empty.importCta': 'Importuj z pliku',
  'recipes.loadError': 'Nie udało się wczytać przepisów',
  'recipes.loadErrorHelp':
    'Upewnij się, że backend działa, a BACKEND_URL w frontend/.env.local wskazuje na niego (domyślnie http://localhost:3001). Jeśli ustawiono RECIPES_PROXY_SECRET w backendzie, użyj tej samej wartości w frontend/.env.local.',
  'recipes.deleteAria': 'Usuń {title}',
  'recipes.editAria': 'Edytuj {title}',
  'recipes.delete.title': 'Usunąć przepis?',
  'recipes.delete.body':
    'Przepis „{title}” zostanie trwale usunięty. Tej operacji nie można cofnąć.',
  'recipes.delete.notFound': 'Nie znaleziono przepisu lub nie masz już do niego dostępu.',
  'recipes.delete.failed': 'Nie udało się usunąć tego przepisu.',
  'recipes.delete.network':
    'Błąd sieci podczas usuwania. Sprawdź, czy aplikacja i API działają.',
  'recipes.chip.prep': 'Przygotowanie: {minutes} min',
  'recipes.chip.cook': 'Gotowanie: {minutes} min',
  'recipes.chip.total': 'Łącznie: {minutes} min',
  'recipes.chip.servings': 'Porcje: {count}',
  'recipes.import.invalidJson': 'Ten plik nie jest poprawnym plikiem JSON.',
  'recipes.import.failed': 'Nie udało się zaimportować tego pliku.',
  'recipes.import.success.one': 'Zaimportowano {count} przepis.',
  'recipes.import.success.few': 'Zaimportowano {count} przepisy.',
  'recipes.import.success.many': 'Zaimportowano {count} przepisów.',
  'recipes.import.success.other': 'Zaimportowano {count} przepisu.',
  'recipes.import.skipped.one': 'Pominięto {count} przepis bez tytułu.',
  'recipes.import.skipped.few': 'Pominięto {count} przepisy bez tytułu.',
  'recipes.import.skipped.many': 'Pominięto {count} przepisów bez tytułu.',
  'recipes.import.skipped.other': 'Pominięto {count} przepisu bez tytułu.',

  'detail.title': 'Przepis',
  'detail.back': 'Powrót do przepisów',
  'detail.ingredients': 'Składniki',
  'detail.instructions': 'Sposób przygotowania',
  'detail.noIngredients': 'Ten przepis nie ma podanych składników.',
  'detail.notFound': 'Nie znaleziono przepisu lub nie masz już do niego dostępu.',
  'detail.loadError': 'Nie udało się wczytać tego przepisu',

  'add.appBarTitle': 'Dodaj nowy przepis',
  'add.heading': 'Utwórz nowy przepis',
  'add.titleLabel': 'Tytuł przepisu *',
  'add.descriptionLabel': 'Opis',
  'add.descriptionPlaceholder': 'Opisz swój przepis…',
  'add.prepTime': 'Czas przygotowania (minuty)',
  'add.cookTime': 'Czas gotowania (minuty)',
  'add.servings': 'Liczba porcji',
  'add.ingredients': 'Składniki',
  'add.addIngredient': 'Dodaj składnik',
  'add.amount': 'Ilość',
  'add.unit': 'Jednostka',
  'add.unitPlaceholder': 'np. szklanki, łyżki, g',
  'add.ingredientName': 'Nazwa składnika',
  'add.ingredientNamePlaceholder': 'Wybierz z listy lub wpisz nowy składnik',
  'add.instructions': 'Sposób przygotowania',
  'add.addStep': 'Dodaj krok',
  'add.stepPlaceholder': 'Krok {number}…',
  'add.tags': 'Tagi',
  'add.addTagLabel': 'Dodaj tag',
  'add.tagPlaceholder': 'np. wegetariańskie, szybkie, deser',
  'add.save': 'Zapisz przepis',
  'add.saving': 'Zapisywanie…',
  'add.titleRequired': 'Tytuł przepisu jest wymagany',
  'add.saveFailedStatus': 'Nie udało się zapisać przepisu ({status})',
  'add.saveFailedGeneric': 'Nie udało się zapisać przepisu. Spróbuj ponownie.',
  'edit.appBarTitle': 'Edytuj przepis',
  'edit.heading': 'Edytuj przepis',
  'edit.save': 'Zapisz zmiany',
  'edit.saving': 'Zapisywanie…',
  'edit.saveFailedStatus': 'Nie udało się zaktualizować przepisu ({status})',
};

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, pl };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
