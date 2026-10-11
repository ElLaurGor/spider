/// <reference types="node" />
// Run: npm run test:live. Hits the real Open-Meteo, SMHI, Krisinformation and Livsmedelsverket APIs (needs internet). Prints what came back.
import assert from 'node:assert/strict';

import { foodNutrients, loadFoods, searchFoods } from '../src/lib/food-db';
import { fetchAir, fetchSmhi, fetchVma } from '../src/lib/outside';
import { findPlace, withCounty } from '../src/lib/weather';

(async () => {
  for (const q of ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Kiruna']) {
    const p = await findPlace(q);
    console.log(q, '->', p?.name, '|', p?.county);
  }
  const old = await withCounty({ name: 'Stockholm, Sverige', lat: 59.33, lon: 18.07 });
  console.log('withCounty(old save) ->', old.county);
  assert.equal(old.county, 'Stockholms län');

  const air = await fetchAir({ name: 'Stockholm', lat: 59.33, lon: 18.07 });
  console.log('air now', { aqi: air.aqi, pm25: air.pm25, pm10: air.pm10, uv: air.uv }, 'days', air.days.length);
  for (const d of air.days) console.log(' ', d.date, 'aqi', d.aqi, 'uv', d.uv, JSON.stringify(d.pollen));
  assert.ok(air.days.length >= 3);

  // SMHI: list every county name that appears, so we know the matching works.
  const raw = (await (await fetch('https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json')).json()) as {
    warningAreas: { warningLevel: { code: string }; affectedAreas: { sv?: string }[] }[];
  }[];
  const names = new Set(raw.flatMap((w) => w.warningAreas.flatMap((a) => a.affectedAreas.map((x) => x.sv))));
  console.log('SMHI active warnings:', raw.length, 'areas named:', [...names].slice(0, 25).join(', '));
  const counties = [...names].filter((n): n is string => !!n && n.endsWith('län'));
  if (counties[0]) {
    const got = await fetchSmhi(counties[0]);
    console.log(`fetchSmhi(${counties[0]}) ->`, got.length, got.slice(0, 3).map((a) => `${a.level}: ${a.title} | ${a.text.slice(0, 80)}`));
    assert.ok(got.length > 0);
  }
  console.log('fetchSmhi(Stockholms län) ->', (await fetchSmhi('Stockholms län')).map((a) => `${a.level}: ${a.title}`));

  const vRaw = await (await fetch('https://api.krisinformation.se/v3/vmas?format=json')).json();
  console.log('VMA raw count', Array.isArray(vRaw) ? vRaw.length : typeof vRaw, Array.isArray(vRaw) && vRaw[0] ? Object.keys(vRaw[0]) : '');
  console.log('fetchVma(Stockholms län) ->', await fetchVma('Stockholms län'));

  // Livsmedelsverket: the food list loads, search finds plain foods, nutrients parse.
  const foods = await loadFoods();
  console.log('Livsmedelsverket foods:', foods.length);
  assert.ok(foods.length > 2000);
  for (const q of ['havregryn', 'ägg', 'kycklingfilé', 'knäckebröd']) {
    const hit = searchFoods(foods, q)[0];
    assert.ok(hit, `no match for ${q}`);
    const n = await foodNutrients(hit.id);
    console.log(`${q} -> ${hit.name}: ${n.kcal100} kcal, ${n.protein100} g protein per 100 g`);
    assert.ok(n.kcal100 > 0);
  }
  console.log('all ok');
})().catch((e) => {
  console.error('FAILED', e);
  process.exit(1);
});
