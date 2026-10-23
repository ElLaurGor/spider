/// <reference types="node" />
// Run: npm run test:live. Hits the real Open-Meteo, SMHI, Krisinformation and Livsmedelsverket APIs (needs internet). Prints what came back.
import assert from 'node:assert/strict';

import { foodNutrients, loadFoods, searchFoods } from '../src/lib/food-db';
import { alertWhen, fetchAir, fetchSmhi, fetchVma, SMHI_PAGE } from '../src/lib/outside';
import { fetchWeather, fetchWeatherHistory, findPlace, rainNote, withCounty } from '../src/lib/weather';

(async () => {
  for (const q of ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Kiruna']) {
    const p = await findPlace(q);
    console.log(q, '->', p?.name, '|', p?.county);
  }
  const old = await withCounty({ name: 'Stockholm, Sverige', lat: 59.33, lon: 18.07 });
  console.log('withCounty(old save) ->', old.county);
  assert.equal(old.county, 'Stockholms län');

  const wx = await fetchWeather({ name: 'Stockholm', lat: 59.33, lon: 18.07 });
  const t = wx.days[0];
  console.log('weather today', t.date, `sun ${new Date(t.sunrise).toTimeString().slice(0, 5)}-${new Date(t.sunset).toTimeString().slice(0, 5)}`, `${t.daylightMin} min daylight, ${t.sunshineMin} min sun, ${t.rainMm} mm`);
  console.log('rain next hours', wx.soon.length, 'slots ->', rainNote(wx.soon) ?? 'dry');
  assert.ok(t.sunrise < t.sunset && t.daylightMin > 0 && wx.soon.length > 0);
  const past = await fetchWeatherHistory({ name: 'Stockholm', lat: 59.33, lon: 18.07 }, 60);
  const pastKeys = Object.keys(past);
  console.log('weather history', pastKeys.length, 'days,', pastKeys[0], JSON.stringify(past[pastKeys[0]]));
  assert.ok(pastKeys.length >= 60);
  const drops = pastKeys.map((k) => past[k].pressureDrop).filter((x): x is number => x != null);
  console.log('pressure drops', drops.length, 'days with data, biggest', Math.max(...drops), 'hPa; yesterday', past[pastKeys[pastKeys.length - 2]].pressureDrop);
  assert.ok(drops.length >= 55, 'hourly pressure_msl gives a 24 h drop for (almost) every past day');
  // The plain forecast API now stops ~43 days back and pads the rest with nulls; those must not turn into 0° days.
  const blank = pastKeys.filter((k) => past[k].code == null || (past[k].max === 0 && past[k].min === 0 && !past[k].sunMin));
  console.log('weather history blank rows', blank.length, blank.slice(0, 3));
  assert.equal(blank.length, 0, 'no all-null history rows');

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
  console.log(
    'fetchSmhi(Stockholms län) ->',
    (await fetchSmhi('Stockholms län')).map((a) => `${a.level}: ${a.title} (${alertWhen(a) || 'no dates'}, updated ${a.updated})`),
  );
  // "Tap for details" must land on a live page: SMHI moved theirs once and the old path 404'd.
  const page = await fetch(SMHI_PAGE);
  console.log('SMHI page', SMHI_PAGE, '->', page.status, page.url);
  assert.ok(page.ok, `SMHI page ${SMHI_PAGE} answered ${page.status}`);

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
