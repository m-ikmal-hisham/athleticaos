import { VideoCamera, ArrowSquareOut } from '@phosphor-icons/react';
import type { LivestreamLink } from '@/types';

interface WatchLiveLinksProps {
    links?: LivestreamLink[] | null;
    title?: string;
    className?: string;
}

// The API only stores http(s) links; this keeps an older or hand-edited row from becoming a
// javascript: href on a public page.
const isWebLink = (url: string) => /^https?:\/\//i.test(url.trim());

/** A row of "watch" buttons, one per stream. Renders nothing when there is no usable link. */
export const WatchLiveLinks = ({ links, title = 'Watch live', className = '' }: WatchLiveLinksProps) => {
    const usable = (links ?? []).filter(link => link?.url && isWebLink(link.url));
    if (usable.length === 0) return null;

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 mr-1">
                <VideoCamera className="w-4 h-4 text-red-500" weight="fill" /> {title}
            </span>
            {usable.map((link, index) => (
                <a
                    key={`${link.url}-${index}`}
                    href={link.url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-wider transition-transform hover:scale-105"
                >
                    {link.label?.trim() || (usable.length > 1 ? `Stream ${index + 1}` : 'Watch')}
                    <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
                </a>
            ))}
        </div>
    );
};
