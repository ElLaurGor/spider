// Product lookup by barcode in Open Food Facts (free, open database, no key), and plain foods
// ("havregryn", "ägg kokt") from Livsmedelsverket's food database (free, no key, Swedish names).
export type Product = {
  code: string;
  name: string;
  kcal100: number; // per 100 g/ml
  protein100: number;
  servingG: number | null;
};

export async function lookupBarcode(code: string): Promise<Product | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,brands,nutriments,serving_quantity`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SPIDER/1.2 (personal Android app)' } });
  if (!res.ok && res.status !== 404) throw new Error(`Lookup failed (${res.status})`);
  const json = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      serving_quantity?: number | string;
      nutriments?: Record<string, number | string | undefined>;
    };
  };
  const p = json.product;
  if (json.status !== 1 || !p) return null;
  const n = p.nutriments ?? {};
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
  const brand = p.brands?.split(',')[0]?.trim();
  const name = p.product_name?.trim() || 'Unknown product';
  return {
    code,
    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    kcal100: Math.round(num(n['energy-kcal_100g'])),
    protein100: Math.round(num(n.proteins_100g) * 10) / 10,
    servingG: num(p.serving_quantity) || null,
  };
}

const SLV = 'https://dataportal.livsmedelsverket.se/livsmedel/api/v1';

export type Food = { id: number; name: string };

let foodList: Promise<Food[]> | null = null;

/** Every food in Livsmedelsverket's database (~2,600 names), fetched once per app run. */
export function loadFoods(): Promise<Food[]> {
  foodList ??= fetch(`${SLV}/livsmedel?offset=0&limit=5000&sprak=1`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Food list failed (${res.status})`);
      const json = (await res.json()) as { livsmedel?: { nummer: number; namn: string }[] };
      return (json.livsmedel ?? []).map((x) => ({ id: x.nummer, name: x.namn.trim() }));
    })
    .catch((e: unknown) => {
      foodList = null; // try again next time
      throw e;
    });
  return foodList;
}

// Everyday words for foods the database names differently.
const ALIASES: Record<string, string> = {
  knäckebröd: 'hårt bröd',
  keso: 'cottage cheese',
  kesella: 'kvarg',
  kycklingfilé: 'kyckling bröstfilé',
  kycklingbröst: 'kyckling bröstfilé',
  havremjölk: 'havredryck',
  sojamjölk: 'sojadryck',
  mandlar: 'mandel',
  pannkakor: 'pannkaka',
};

const SEPARATOR = /[\s,.()/-]/;

/**
 * Best matches for what's typed: the whole name, then names starting with it as a word ("Ägg kokt"
 * before "Äggröra"), then as a prefix, then every typed word as a word or word start, then anywhere
 * (so "gröt" still finds "Havregrynsgröt"). Shorter, plainer names first.
 */
export function searchFoods(foods: Food[], query: string, limit = 6): Food[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .flatMap((t) => (ALIASES[t] ?? t).split(' '))
    .filter(Boolean);
  const q = tokens.join(' ');
  if (q.length < 2) return [];
  const scored: { food: Food; score: number }[] = [];
  for (const food of foods) {
    const name = food.name.toLowerCase();
    if (!tokens.every((t) => name.includes(t))) continue;
    const words = name.split(new RegExp(`${SEPARATOR.source}+`));
    const score =
      name === q
        ? 0
        : name.startsWith(q) && SEPARATOR.test(name[q.length])
          ? 1
          : name.startsWith(q)
            ? 2
            : tokens.every((t) => words.includes(t))
              ? 3
              : tokens.every((t) => words.some((w) => w.startsWith(t)))
                ? 4
                : 5;
    scored.push({ food, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.food.name.length - b.food.name.length || a.food.name.localeCompare(b.food.name, 'sv'))
    .slice(0, limit)
    .map((x) => x.food);
}

/** kcal and protein per 100 g of one food. */
export async function foodNutrients(id: number): Promise<{ kcal100: number; protein100: number }> {
  const res = await fetch(`${SLV}/livsmedel/${id}/naringsvarden?sprak=1`);
  if (!res.ok) throw new Error(`Nutrients failed (${res.status})`);
  const rows = (await res.json()) as { euroFIRkod?: string; enhet?: string; varde?: number }[];
  const kcal = rows.find((r) => r.euroFIRkod === 'ENERC' && r.enhet === 'kcal')?.varde ?? 0;
  const protein = rows.find((r) => r.euroFIRkod === 'PROT')?.varde ?? 0;
  return { kcal100: Math.round(kcal), protein100: Math.round(protein * 10) / 10 };
}
