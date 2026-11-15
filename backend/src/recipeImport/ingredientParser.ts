/**
 * Deterministic "300 g flour" -> { name, amount, unit } parser for imported recipes.
 *
 * It is intentionally conservative: when a line cannot be understood, the whole line
 * is kept as the ingredient name with amount 0, so nothing is silently lost. This is
 * also the seam where an AI normalizer would take over for the unparsed remainder.
 */

export type ParsedIngredient = {
  name: string;
  amount: number;
  unit: string;
};

const VULGAR_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/** Variant spellings mapped to the single form stored on the recipe. */
const UNIT_VARIANTS: [canonical: string, variants: string[]][] = [
  ['g', ['g', 'gr', 'gram', 'grams', 'gramy', 'gramów', 'grama']],
  ['kg', ['kg', 'kilo', 'kilogram', 'kilograms', 'kilogramy', 'kilogramów']],
  ['dag', ['dag', 'dkg', 'deka', 'dekagram', 'dekagramy', 'dekagramów']],
  ['mg', ['mg', 'milligram', 'milligrams', 'miligram', 'miligramy']],
  ['ml', ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'mililitr', 'mililitry', 'mililitrów']],
  ['l', ['l', 'liter', 'liters', 'litre', 'litres', 'litr', 'litry', 'litrów']],
  ['dl', ['dl', 'deciliter', 'deciliters', 'decylitr']],
  ['oz', ['oz', 'ounce', 'ounces']],
  ['lb', ['lb', 'lbs', 'pound', 'pounds']],
  ['tsp', ['tsp', 'tsps', 'teaspoon', 'teaspoons']],
  ['tbsp', ['tbsp', 'tbsps', 'tablespoon', 'tablespoons']],
  ['cup', ['cup', 'cups']],
  ['pinch', ['pinch', 'pinches']],
  ['clove', ['clove', 'cloves']],
  ['slice', ['slice', 'slices']],
  ['can', ['can', 'cans', 'tin', 'tins']],
  ['package', ['package', 'packages', 'pack', 'packs', 'pkg']],
  ['bunch', ['bunch', 'bunches']],
  ['handful', ['handful', 'handfuls']],
  ['piece', ['piece', 'pieces']],
  ['łyżka', ['łyżka', 'łyżki', 'łyżek', 'łyżkę', 'lyzka', 'lyzki', 'lyzek']],
  ['łyżeczka', ['łyżeczka', 'łyżeczki', 'łyżeczek', 'łyżeczkę', 'lyzeczka', 'lyzeczki', 'lyzeczek']],
  ['szklanka', ['szklanka', 'szklanki', 'szklanek', 'szklankę']],
  ['szczypta', ['szczypta', 'szczypty', 'szczyptę']],
  ['ząbek', ['ząbek', 'ząbki', 'ząbków', 'zabek', 'zabki']],
  ['opakowanie', ['opakowanie', 'opakowania', 'opakowań', 'opak']],
  ['puszka', ['puszka', 'puszki', 'puszek', 'puszkę']],
  ['garść', ['garść', 'garści', 'garstka', 'garsc']],
  ['pęczek', ['pęczek', 'pęczki', 'peczek']],
  ['plasterek', ['plasterek', 'plasterki', 'plasterków']],
  ['kostka', ['kostka', 'kostki', 'kostek']],
  ['szt', ['szt', 'szt.', 'sztuka', 'sztuki', 'sztuk']],
];

const UNIT_LOOKUP = new Map<string, string>();
for (const [canonical, variants] of UNIT_VARIANTS) {
  for (const variant of variants) {
    UNIT_LOOKUP.set(variant, canonical);
  }
}

/** "1", "1.5", "1,5", "3/4", "1 1/2", "1½" and ranges like "2-3" (lower bound wins). */
function readAmount(text: string): { amount: number; rest: string } | null {
  const pattern = new RegExp(
    String.raw`^(?:(\d+(?:[.,]\d+)?)(?!\s*\/\s*\d)\s*)?(\d+\s*\/\s*\d+|[${Object.keys(VULGAR_FRACTIONS).join('')}])?`
  );
  const match = text.match(pattern);
  if (!match || (!match[1] && !match[2])) return null;

  let amount = match[1] ? Number(match[1].replace(',', '.')) : 0;

  if (match[2]) {
    const fraction = VULGAR_FRACTIONS[match[2]];
    if (fraction !== undefined) {
      amount += fraction;
    } else {
      const [num, den] = match[2].split('/').map((part) => Number(part.trim()));
      if (den) amount += num / den;
    }
  }

  if (!Number.isFinite(amount)) return null;

  let rest = text.slice(match[0].length);
  // Ranges ("2-3 tbsp", "2 to 3 tbsp"): keep the lower bound and drop the upper one.
  rest = rest.replace(/^\s*(?:-|–|—|to|do)\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/i, '');

  return { amount: Math.round(amount * 1000) / 1000, rest: rest.trim() };
}

function readUnit(text: string): { unit: string; rest: string } | null {
  const match = text.match(/^([\p{L}.]+)/u);
  if (!match) return null;

  const candidate = match[1].toLowerCase().replace(/\.$/, '');
  const canonical = UNIT_LOOKUP.get(candidate) ?? UNIT_LOOKUP.get(`${candidate}.`);
  if (!canonical) return null;

  return { unit: canonical, rest: text.slice(match[0].length).trim() };
}

const FRACTION_CHARS = Object.keys(VULGAR_FRACTIONS).join('');

/**
 * Some sites write the quantity after the ingredient ("mąka pszenna 300 g",
 * "soda oczyszczona 1 płaska łyżeczka"), so this is tried when the line does not
 * start with a number.
 */
function readTrailingAmount(text: string): ParsedIngredient | null {
  const match = text.match(
    new RegExp(
      String.raw`\s(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[${FRACTION_CHARS}])\s*((?:[\p{L}.]+\s*){0,2})$`,
      'u'
    )
  );
  if (!match) return null;

  const quantity = readAmount(match[1]);
  const name = text.slice(0, match.index).trim();
  if (!quantity || !name) return null;

  const trailingWords = match[2].trim();
  let unit = '';
  if (trailingWords) {
    // The unit is the last word ("1 płaska łyżeczka"); anything else is not a quantity.
    const lastWord = trailingWords.split(/\s+/).pop() ?? '';
    unit = readUnit(lastWord)?.unit ?? '';
    if (!unit) return null;
  }

  return { name, amount: quantity.amount, unit };
}

/** Parses one ingredient line, e.g. "2 łyżki oliwy" or "1 1/2 cups flour, sifted". */
export function parseIngredientLine(line: string): ParsedIngredient | null {
  const cleaned = line
    .replace(/\s+/g, ' ')
    .replace(/^[-–—•*·\s]+/, '')
    .trim();
  if (!cleaned) return null;

  const quantity = readAmount(cleaned);
  if (!quantity) {
    return readTrailingAmount(cleaned) ?? { name: cleaned, amount: 0, unit: '' };
  }

  const unitRead = readUnit(quantity.rest);
  const unit = unitRead?.unit ?? '';
  let name = (unitRead?.rest ?? quantity.rest).trim();

  // Drop the connector left behind by "2 cups of flour" / "2 szklanki mąki".
  name = name.replace(/^(?:of|z)\s+/i, '').replace(/^[-–—:,\s]+/, '').trim();

  if (!name) {
    // Nothing descriptive left (e.g. a bare "2") - keep the original line instead.
    return { name: cleaned, amount: 0, unit: '' };
  }

  return { name, amount: quantity.amount, unit };
}

export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  return lines
    .map((line) => parseIngredientLine(line))
    .filter((ing): ing is ParsedIngredient => ing !== null);
}
