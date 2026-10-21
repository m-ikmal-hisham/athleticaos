export type Block =
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'table'; headers: string[]; rows: string[][] };

export interface LegalSection {
    id: string;
    heading: string;
    body: Block[];
}

export interface LegalDoc {
    title: string;
    intro?: string;
    sections: LegalSection[];
}

export type LegalDocStatus = 'draft' | 'final';

export interface LegalDocumentModule {
    version: string;
    lastUpdated: string;
    status: LegalDocStatus;
    en: LegalDoc;
    ms: LegalDoc;
    placeholdersPresent: boolean;
}

/**
 * Checks if any block in a LegalDoc contains a square-bracket placeholder like "[...]"
 */
export function countPlaceholdersInDoc(doc: LegalDoc): boolean {
    for (const section of doc.sections) {
        for (const block of section.body) {
            if (block.type === 'p' && block.text.includes('[')) {
                return true;
            }
            if (block.type === 'ul' && block.items.some(item => item.includes('['))) {
                return true;
            }
            if (block.type === 'table') {
                if (block.headers.some(h => h.includes('['))) return true;
                if (block.rows.some(row => row.some(cell => cell.includes('[')))) return true;
            }
        }
    }
    return false;
}

export function isDocumentPublishable(module: LegalDocumentModule): boolean {
    return module.status === 'final' && !module.placeholdersPresent;
}
