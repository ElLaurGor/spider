// Product lookup by barcode in Open Food Facts (free, open database, no key).
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
