/// <reference types="node" />
// Builds src/lib/sthlm-climate.json, the table behind Stockholm's "on this day" weather trivia.
// Run: npx --yes tsx scripts/build-sthlm-climate.ts [--cache <dir>] [--until YYYY-MM-DD]
//
// Source: SMHI open data (CC BY 4.0), Stockholm Observatoriekullen. The manual station 98210 has daily means
// from 1 Jan 1859 and daily max/min from 1941, up to 31 Mar 2024; the automatic station 98230 on the same hill
// (1996 onwards, still running) carries the series on. Where both exist they agree to within 0.03° on average,
// so 98210 is used while it runs and 98230 after it, its latest four months included. `--until` (default:
// yesterday) leaves out today's still-running max and min. `--cache` keeps the downloads for a rerun.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildClimateTable, joinObs, parseSmhiCsv, parseSmhiLatest } from '../src/lib/climate-table';

const BASE = 'https://opendata-download-metobs.smhi.se/api/version/latest';
const PARAMS = { mean: 2, min: 19, max: 20 } as const;
const OLD = '98210';
const NOW = '98230';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const cache = arg('--cache');
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();
const until = arg('--until') ?? yesterday;

async function download(url: string, file: string): Promise<string> {
  const path = cache ? join(cache, file) : null;
  if (path && existsSync(path)) return readFileSync(path, 'utf8');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const text = await res.text();
  if (path) {
    mkdirSync(cache!, { recursive: true });
    writeFileSync(path, text);
  }
  return text;
}

/** One parameter's whole series: the old station while it ran, then the new one's archive, then its latest months. */
async function series(p: number): Promise<Map<string, number>> {
  const old = parseSmhiCsv(await download(`${BASE}/parameter/${p}/station/${OLD}/period/corrected-archive/data.csv`, `${OLD}-${p}.csv`));
  const now = parseSmhiCsv(await download(`${BASE}/parameter/${p}/station/${NOW}/period/corrected-archive/data.csv`, `${NOW}-${p}.csv`));
  const latest = parseSmhiLatest(JSON.parse(await download(`${BASE}/parameter/${p}/station/${NOW}/period/latest-months/data.json`, `${NOW}-${p}-latest.json`)));
  const out = new Map(old);
  const oldEnd = [...old.keys()].sort().at(-1) ?? '';
  for (const [d, v] of now) if (d > oldEnd) out.set(d, v);
  const nowEnd = [...out.keys()].sort().at(-1) ?? '';
  for (const [d, v] of latest) if (d > nowEnd) out.set(d, v);
  console.log(`parameter ${p}: ${old.size} days from ${OLD} (to ${oldEnd}), then ${NOW} to ${[...out.keys()].sort().at(-1)}`);
  return out;
}

(async () => {
  const [mean, min, max] = [await series(PARAMS.mean), await series(PARAMS.min), await series(PARAMS.max)];
  const obs = joinObs(mean, max, min, until);
  const table = buildClimateTable(obs, { source: 'SMHI open data (CC BY 4.0): Stockholm Observatoriekullen 98210, then 98230', normal: [1991, 2020] });
  const json = JSON.stringify(table);
  const out = join(process.cwd(), 'src', 'lib', 'sthlm-climate.json');
  writeFileSync(out, `${json}\n`);
  console.log(`${out}: ${json.length} bytes, ${obs.length} days, means from ${table.from}, max/min from ${table.extremesFrom}, through ${table.through}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
