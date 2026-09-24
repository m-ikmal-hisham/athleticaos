import { Plus, Trash } from '@phosphor-icons/react';
import type { LivestreamLink } from '@/types';

// Mirrors LivestreamLinks.MAX_LINKS on the backend.
const MAX_LINKS = 10;

interface LivestreamLinksEditorProps {
    value: LivestreamLink[];
    onChange: (links: LivestreamLink[]) => void;
    error?: string;
}

/**
 * Edits a tournament's livestream links: one row per stream, each with an optional label
 * ("Pitch A", "Day 2") so viewers can tell them apart. Rows left without a url are dropped on save.
 */
export const LivestreamLinksEditor = ({ value, onChange, error }: LivestreamLinksEditorProps) => {
    const links = value.length > 0 ? value : [{ label: '', url: '' }];

    const update = (index: number, patch: Partial<LivestreamLink>) =>
        onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Livestream links</label>
            {links.map((link, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                    <input
                        className="input-base sm:w-44"
                        placeholder="Label (e.g. Pitch A)"
                        value={link.label ?? ''}
                        maxLength={60}
                        onChange={e => update(index, { label: e.target.value })}
                    />
                    <div className="flex gap-2 flex-1">
                        <input
                            className="input-base flex-1"
                            type="url"
                            placeholder="https://youtube.com/live/..."
                            value={link.url}
                            onChange={e => update(index, { url: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => onChange(links.filter((_, i) => i !== index))}
                            className="shrink-0 px-3 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            aria-label="Remove link"
                        >
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                    Shown on the tournament page and on every match without its own link.
                </p>
                {links.length < MAX_LINKS && (
                    <button
                        type="button"
                        onClick={() => onChange([...links, { label: '', url: '' }])}
                        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-600"
                    >
                        <Plus className="w-4 h-4" /> Add link
                    </button>
                )}
            </div>
        </div>
    );
};
