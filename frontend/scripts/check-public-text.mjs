import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '../src');
const scanDirs = [
    join(srcDir, 'pages/public'),
    join(srcDir, 'components/public'),
];

// World Rugby standard terms & technical constants allowed in UI
const ALLOWED_TERMS = new Set([
    'AthleticaOS',
    'Ragbi Online',
    'Rugby',
    'Malaysia Rugby',
    'FT',
    'W/O',
    'PLD',
    'PF',
    'PA',
    'PD',
    'BP',
    'PTS',
    'POS',
    'P',
    'W',
    'D',
    'L',
    'Try',
    'Conversion',
    'Penalty Try',
    'Drop Goal',
    'Yellow Card',
    'Red Card',
    'Sin Bin',
    'Scrum',
    'Lineout',
    'Ruck',
    'Maul',
    'Loosehead Prop',
    'Hooker',
    'Tighthead Prop',
    'Scrum-half',
    'Fly-half',
    'Centre',
    'Wing',
    'DG',
    'YC',
    'RC',
    'PT',
    'PEN',
    'CON',
    'SUB',
    'Website', // Honeypot hidden input
]);

// EN locale files, to check that every fixed t() key used on public pages exists
const enDir = join(srcDir, 'i18n/locales/en');
const enLocales = Object.fromEntries(
    readdirSync(enDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(enDir, f), 'utf8'))])
);

function keyExists(ns, key) {
    let node = enLocales[ns];
    if (node === undefined) return false;
    for (const part of key.split('.')) {
        if (node && typeof node === 'object' && part in node) {
            node = node[part];
        } else if (node && typeof node === 'object' && Object.keys(node).some((k) => k.startsWith(`${part}_`))) {
            return true; // plural forms (key_one / key_other)
        } else {
            return false;
        }
    }
    return true;
}

function getAllFiles(dir, exts = ['.tsx']) {
    let files = [];
    if (!readdirSync) return files;
    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, exts));
        } else if (exts.some((ext) => entry.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function isAllowed(str) {
    const trimmed = cleanText(str);
    if (!trimmed) return true;

    // Only numbers, punctuation, symbols (e.g. "·", "•", "-", "/", ":", "+", "%", "()", etc.)
    if (/^[\d\s\p{P}\p{S}·•—–→←+/*#%:()|&,-]+$/u.test(trimmed)) return true;

    if (ALLOWED_TERMS.has(trimmed)) return true;
    if (trimmed.length <= 1) return true;

    // Compound of allowed tokens and numbers/symbols
    const tokens = trimmed.split(/[\s·•—–→←+/*#%:()|&,-]+/).filter(Boolean);
    if (tokens.length > 0 && tokens.every((tok) => ALLOWED_TERMS.has(tok) || /^\d+$/.test(tok))) {
        return true;
    }

    return false;
}

let totalIssues = 0;
const issuesByFile = new Map();

for (const dir of scanDirs) {
    const files = getAllFiles(dir, ['.tsx']);
    for (const filePath of files) {
        const relPath = relative(srcDir, filePath);
        const code = readFileSync(filePath, 'utf8');

        const sourceFile = ts.createSourceFile(
            filePath,
            code,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
        );

        // Default namespace = first one passed to useTranslation in this file
        const nsMatch = code.match(/useTranslation\(\s*(\[[^\]]*\]|'[^']*')/);
        const defaultNs = nsMatch ? (nsMatch[1].match(/'([^']+)'/) || [, 'common'])[1] : 'common';

        function visit(node) {
            // t('ns:key') / t('key') with a fixed string: the key must exist in the EN locale files
            if (node.kind === ts.SyntaxKind.CallExpression
                && node.expression.kind === ts.SyntaxKind.Identifier
                && node.expression.text === 't'
                && node.arguments.length > 0
                && node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
                const raw = node.arguments[0].text;
                const [ns, key] = raw.includes(':') ? raw.split(/:(.*)/s) : [defaultNs, raw];
                if (!keyExists(ns, key)) {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const fileIssues = issuesByFile.get(relPath) || [];
                    fileIssues.push({ line: line + 1, text: `[missing key] ${ns}:${key}` });
                    issuesByFile.set(relPath, fileIssues);
                    totalIssues++;
                }
            }

            // Check JSX Text: <tag>Literal Text</tag>
            if (node.kind === ts.SyntaxKind.JsxText) {
                const rawText = node.getText(sourceFile);
                if (!isAllowed(rawText)) {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const fileIssues = issuesByFile.get(relPath) || [];
                    fileIssues.push({ line: line + 1, text: cleanText(rawText) });
                    issuesByFile.set(relPath, fileIssues);
                    totalIssues++;
                }
            }

            // Check literal string attributes: placeholder="...", aria-label="...", title="..."
            if (node.kind === ts.SyntaxKind.JsxAttribute) {
                const attrName = node.name.getText(sourceFile);
                if (['placeholder', 'aria-label', 'title', 'alt'].includes(attrName) && node.initializer) {
                    if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
                        const attrText = node.initializer.text;
                        if (!isAllowed(attrText)) {
                            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                            const fileIssues = issuesByFile.get(relPath) || [];
                            fileIssues.push({ line: line + 1, text: `[${attrName}] ${cleanText(attrText)}` });
                            issuesByFile.set(relPath, fileIssues);
                            totalIssues++;
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        }

        visit(sourceFile);
    }
}

if (totalIssues > 0) {
    console.log(`\n❌ Found ${totalIssues} hardcoded string(s) or missing key(s) in public pages:\n`);
    for (const [file, issues] of issuesByFile) {
        console.log(`📄 ${file}:`);
        for (const issue of issues) {
            console.log(`   Line ${issue.line}: "${issue.text}"`);
        }
    }
    process.exit(1);
} else {
    console.log('✔ Public text scan passed: no hardcoded strings or missing keys in public pages and components.');
    process.exit(0);
}
