// Generates the small geography data used by AddressInputs, so the app no longer
// ships the full country-state-city database (8.6 MB) to the browser.
//   src/data/geo/countries.json      [{ isoCode, name }] for every country
//   public/geo/states/<ISO>.json     [{ isoCode, name }] per country that has states
// Run with: npm run geo:build
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Country, State } from 'country-state-city';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const countriesFile = join(root, 'src/data/geo/countries.json');
const statesDir = join(root, 'public/geo/states');

const byName = (a, b) => a.name.localeCompare(b.name);

const countries = Country.getAllCountries()
    .map(({ isoCode, name }) => ({ isoCode, name }))
    .sort(byName);

mkdirSync(dirname(countriesFile), { recursive: true });
writeFileSync(countriesFile, JSON.stringify(countries) + '\n');

rmSync(statesDir, { recursive: true, force: true });
mkdirSync(statesDir, { recursive: true });
let files = 0;
for (const { isoCode } of countries) {
    const states = State.getStatesOfCountry(isoCode)
        .map(({ isoCode: code, name }) => ({ isoCode: code, name }));
    if (states.length === 0) continue;
    writeFileSync(join(statesDir, `${isoCode}.json`), JSON.stringify(states) + '\n');
    files++;
}

console.log(`countries: ${countries.length}, state files: ${files}`);
