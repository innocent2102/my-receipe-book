import type { Locale } from '../../i18n/translations';

/**
 * User-facing description of everything the app can do, shown on /features.
 *
 * Keep this in sync with features.md whenever a feature is added, changed or
 * removed — and always update both locales.
 */
export type FeatureSection = {
  id: string;
  title: string;
  summary: string;
  items: string[];
};

const en: FeatureSection[] = [
  {
    id: 'recipes',
    title: 'Your recipes',
    summary: 'Everything you cook, in one place.',
    items: [
      'Add recipes with a title, description, prep and cook time, servings, ingredients, step-by-step instructions and tags.',
      'Edit any recipe later, or delete it with a confirmation step so nothing disappears by accident.',
      'Browse a clear list that shows the ingredients at a glance, together with time, servings and tag chips.',
      'Open a recipe to see the full ingredient list and numbered steps. Empty sections are simply hidden.',
    ],
  },
  {
    id: 'search',
    title: 'Search',
    summary: 'Find a recipe in seconds.',
    items: [
      'Search by title, description, ingredient or tag.',
      'Type several words to narrow the results — every word has to match.',
      'See how many recipes matched and clear the search with one click.',
    ],
  },
  {
    id: 'ingredients',
    title: 'Ingredient suggestions',
    summary: 'The app learns the ingredients you use.',
    items: [
      'Every ingredient you save is remembered and suggested the next time you type.',
      'Pick an ingredient from the list or simply type a new one — new names are added automatically.',
      'Spelling and capitalisation differences are merged, so each ingredient appears only once.',
      'Remove a suggestion you no longer need.',
    ],
  },
  {
    id: 'video',
    title: 'Video',
    summary: 'Cook along with a video.',
    items: [
      'Add an optional YouTube link to a recipe.',
      'The link is checked as you type and previewed in the form.',
      'The video plays directly inside the recipe.',
    ],
  },
  {
    id: 'grocery',
    title: 'Shopping list',
    summary: 'From recipe to shop without retyping anything.',
    items: [
      'Send ingredients from a recipe straight to your list and pick only what you still need to buy.',
      'Add your own items by hand, with the same ingredient suggestions.',
      'The same ingredient in the same unit is merged into one line with the amounts added up.',
      'Tick items off, mark or unmark everything at once, remove single items or clear everything you already bought.',
      'Items you still need stay at the top of the list.',
    ],
  },
  {
    id: 'planned',
    title: 'Planned recipes',
    summary: 'Keep track of what you are cooking next.',
    items: [
      'Mark a recipe as planned from the list or from the recipe itself.',
      'See everything you plan to cook on one page, newest first.',
      'Unplan a recipe once it is cooked.',
    ],
  },
  {
    id: 'backup',
    title: 'Import and export',
    summary: 'Your recipes stay yours.',
    items: [
      'Export all recipes to a single JSON file with a date in its name.',
      'Import an exported file into any account — up to 500 recipes at a time.',
      'Invalid files are reported, recipes without a title are skipped, and you are told exactly how many were imported.',
    ],
  },
  {
    id: 'offline',
    title: 'Works offline',
    summary: 'Useful even in a shop with no signal.',
    items: [
      'Install the app on your phone or desktop like a native app.',
      'Recipes, planned recipes and the shopping list stay readable without a connection.',
      'Shopping list changes made offline are saved on the device and synced automatically once you are back online.',
      'An indicator shows when you are offline and how many changes are waiting to sync.',
      'You stay signed in while offline.',
    ],
  },
  {
    id: 'interface',
    title: 'Interface',
    summary: 'Comfortable on every device.',
    items: [
      'Full Polish and English translations, including correct plural forms.',
      'The language is detected from your browser and your choice is remembered.',
      'Light and dark theme that follows your system setting and remembers what you pick.',
      'Responsive layout for phone, tablet and desktop.',
    ],
  },
  {
    id: 'privacy',
    title: 'Account and privacy',
    summary: 'Only you see your recipes.',
    items: [
      'Sign in with your Google account.',
      'Recipes, planned recipes, the shopping list and ingredient suggestions are tied to your account.',
      'Pages you are not signed in for redirect to the login screen and bring you back afterwards.',
    ],
  },
];

const pl: FeatureSection[] = [
  {
    id: 'recipes',
    title: 'Twoje przepisy',
    summary: 'Wszystko, co gotujesz, w jednym miejscu.',
    items: [
      'Dodawaj przepisy z tytułem, opisem, czasem przygotowania i gotowania, liczbą porcji, składnikami, krokami oraz tagami.',
      'Edytuj przepis w dowolnej chwili lub usuń go — z potwierdzeniem, żeby nic nie zniknęło przez przypadek.',
      'Przeglądaj czytelną listę ze składnikami na pierwszy rzut oka oraz etykietami czasu, porcji i tagów.',
      'Otwórz przepis, aby zobaczyć pełną listę składników i ponumerowane kroki. Puste sekcje są po prostu ukrywane.',
    ],
  },
  {
    id: 'search',
    title: 'Wyszukiwanie',
    summary: 'Znajdź przepis w kilka sekund.',
    items: [
      'Szukaj po tytule, opisie, składniku lub tagu.',
      'Wpisz kilka słów, aby zawęzić wyniki — każde słowo musi pasować.',
      'Zobacz, ile przepisów pasuje, i wyczyść wyszukiwanie jednym kliknięciem.',
    ],
  },
  {
    id: 'ingredients',
    title: 'Podpowiedzi składników',
    summary: 'Aplikacja zapamiętuje składniki, których używasz.',
    items: [
      'Każdy zapisany składnik jest zapamiętywany i podpowiadany przy kolejnym wpisywaniu.',
      'Wybierz składnik z listy albo wpisz nowy — nowe nazwy dodają się automatycznie.',
      'Różnice w pisowni i wielkości liter są scalane, więc każdy składnik pojawia się tylko raz.',
      'Usuń podpowiedź, której już nie potrzebujesz.',
    ],
  },
  {
    id: 'video',
    title: 'Wideo',
    summary: 'Gotuj razem z filmem.',
    items: [
      'Dodaj opcjonalny link do YouTube w przepisie.',
      'Link jest sprawdzany podczas wpisywania i pokazywany w podglądzie formularza.',
      'Film odtwarza się bezpośrednio w przepisie.',
    ],
  },
  {
    id: 'grocery',
    title: 'Lista zakupów',
    summary: 'Z przepisu do sklepu bez przepisywania.',
    items: [
      'Przenieś składniki z przepisu prosto na listę i wybierz tylko to, co musisz kupić.',
      'Dodawaj własne pozycje ręcznie, z tymi samymi podpowiedziami składników.',
      'Ten sam składnik w tej samej jednostce jest łączony w jedną pozycję z zsumowaną ilością.',
      'Odhaczaj pozycje, zaznaczaj lub odznaczaj wszystkie naraz, usuwaj pojedyncze wpisy albo wyczyść to, co już kupione.',
      'Rzeczy do kupienia zostają na górze listy.',
    ],
  },
  {
    id: 'planned',
    title: 'Zaplanowane przepisy',
    summary: 'Miej pod ręką to, co ugotujesz wkrótce.',
    items: [
      'Oznacz przepis jako zaplanowany z listy lub z samego przepisu.',
      'Zobacz wszystkie plany na jednej stronie, od najnowszych.',
      'Usuń przepis z planów, gdy już go ugotujesz.',
    ],
  },
  {
    id: 'backup',
    title: 'Import i eksport',
    summary: 'Twoje przepisy należą do Ciebie.',
    items: [
      'Wyeksportuj wszystkie przepisy do jednego pliku JSON z datą w nazwie.',
      'Zaimportuj wyeksportowany plik na dowolne konto — do 500 przepisów naraz.',
      'Niepoprawne pliki są zgłaszane, przepisy bez tytułu pomijane, a na koniec widzisz dokładne podsumowanie.',
    ],
  },
  {
    id: 'offline',
    title: 'Działa offline',
    summary: 'Przydatne nawet w sklepie bez zasięgu.',
    items: [
      'Zainstaluj aplikację na telefonie lub komputerze jak zwykłą aplikację.',
      'Przepisy, plany i lista zakupów pozostają dostępne bez połączenia.',
      'Zmiany na liście zakupów zrobione offline zapisują się na urządzeniu i synchronizują automatycznie po powrocie sieci.',
      'Wskaźnik pokazuje brak połączenia i liczbę zmian czekających na synchronizację.',
      'Pozostajesz zalogowany również offline.',
    ],
  },
  {
    id: 'interface',
    title: 'Interfejs',
    summary: 'Wygodny na każdym urządzeniu.',
    items: [
      'Pełne tłumaczenie polskie i angielskie, razem z poprawnymi formami liczby mnogiej.',
      'Język jest wykrywany z przeglądarki, a Twój wybór zapamiętywany.',
      'Jasny i ciemny motyw zgodny z ustawieniem systemu, z zapamiętywaniem wyboru.',
      'Układ dopasowany do telefonu, tabletu i komputera.',
    ],
  },
  {
    id: 'privacy',
    title: 'Konto i prywatność',
    summary: 'Twoje przepisy widzisz tylko Ty.',
    items: [
      'Zaloguj się kontem Google.',
      'Przepisy, plany, lista zakupów i podpowiedzi składników są przypisane do Twojego konta.',
      'Strony wymagające logowania przekierowują na ekran logowania i wracają tam, gdzie byłeś.',
    ],
  },
];

export const featureSections: Record<Locale, FeatureSection[]> = { en, pl };
