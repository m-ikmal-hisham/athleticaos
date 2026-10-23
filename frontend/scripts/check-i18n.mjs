import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/i18n/locales');
const enDir = join(localesDir, 'en');
const msDir = join(localesDir, 'ms');

function flattenKeys(obj, prefix = '') {
    const result = new Map();
    for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            const nested = flattenKeys(val, fullKey);
            for (const [nKey, nVal] of nested) {
                result.set(nKey, nVal);
            }
        } else {
            result.set(fullKey, val);
        }
    }
    return result;
}

let hasErrors = false;
const errors = [];

if (!existsSync(enDir) || !existsSync(msDir)) {
    console.error('❌ Locale directories missing. Expected:', enDir, 'and', msDir);
    process.exit(1);
}

const enFiles = readdirSync(enDir).filter((f) => f.endsWith('.json'));
const msFiles = readdirSync(msDir).filter((f) => f.endsWith('.json'));

// Check for missing namespace files
for (const f of enFiles) {
    if (!msFiles.includes(f)) {
        errors.push(`Namespace file missing in MS: ${f}`);
        hasErrors = true;
    }
}
for (const f of msFiles) {
    if (!enFiles.includes(f)) {
        errors.push(`Namespace file missing in EN: ${f}`);
        hasErrors = true;
    }
}

let totalKeysChecked = 0;

for (const file of enFiles) {
    if (!msFiles.includes(file)) continue;

    const enPath = join(enDir, file);
    const msPath = join(msDir, file);

    let enData;
    let msData;
    try {
        enData = JSON.parse(readFileSync(enPath, 'utf8'));
    } catch (err) {
        errors.push(`JSON parse error in ${enPath}: ${err.message}`);
        hasErrors = true;
        continue;
    }
    try {
        msData = JSON.parse(readFileSync(msPath, 'utf8'));
    } catch (err) {
        errors.push(`JSON parse error in ${msPath}: ${err.message}`);
        hasErrors = true;
        continue;
    }

    const enMap = flattenKeys(enData);
    const msMap = flattenKeys(msData);

    const ns = file.replace('.json', '');

    // Check for keys in EN missing in MS
    for (const [key, val] of enMap) {
        totalKeysChecked++;
        if (!msMap.has(key)) {
            errors.push(`[${ns}] Key missing in MS: "${key}"`);
            hasErrors = true;
        } else {
            const msVal = msMap.get(key);
            if (typeof msVal === 'string' && msVal.trim() === '') {
                errors.push(`[${ns}] Empty string in MS: "${key}"`);
                hasErrors = true;
            }
        }

        if (typeof val === 'string' && val.trim() === '') {
            errors.push(`[${ns}] Empty string in EN: "${key}"`);
            hasErrors = true;
        }
    }

    // Check for extra keys in MS missing in EN
    for (const [key] of msMap) {
        if (!enMap.has(key)) {
            errors.push(`[${ns}] Extra key in MS not found in EN: "${key}"`);
            hasErrors = true;
        }
    }
}

if (hasErrors) {
    console.error(`\n❌ i18n validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
        console.error(`  - ${err}`);
    }
    process.exit(1);
} else {
    console.log(`✔ i18n check passed: ${enFiles.length} namespaces, ${totalKeysChecked} keys verified with 0 errors.`);
    process.exit(0);
}
