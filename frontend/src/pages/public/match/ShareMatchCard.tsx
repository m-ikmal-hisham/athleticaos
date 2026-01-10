import { useState } from 'react';
import { ShareNetwork, Copy, XLogo, FacebookLogo, WhatsappLogo, Check } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail } from '../../../api/public.api';

interface ShareMatchCardProps {
    match: PublicMatchDetail;
    tournamentName?: string;
}

export const ShareMatchCard = ({ match, tournamentName }: ShareMatchCardProps) => {
    const [copied, setCopied] = useState(false);
    const url = window.location.href;
    const text = `Follow the match ${match.homeTeamName} vs ${match.awayTeamName} on AthleticaOS!`;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLinks = [
        {
            name: 'X (Twitter)',
            icon: <XLogo className="w-5 h-5" />,
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            color: 'bg-black text-white hover:bg-gray-800'
        },
        {
            name: 'Facebook',
            icon: <FacebookLogo className="w-5 h-5" weight="fill" />,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            color: 'bg-[#1877F2] text-white hover:bg-[#166fe5]'
        },
        {
            name: 'WhatsApp',
            icon: <WhatsappLogo className="w-5 h-5" weight="fill" />,
            url: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
            color: 'bg-[#25D366] text-white hover:bg-[#22c35e]'
        }
    ];

    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white font-bold">
                <ShareNetwork className="w-5 h-5 text-blue-500" />
                <span>Share Match</span>
            </div>

            {/* Mini Match Preview (Designed to look like the potential OG Image) */}
            <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 opacity-50" />

                <div className="relative p-6 flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    <div className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                        {tournamentName || match.stage || 'Match Result'}
                    </div>

                    <div className="w-full flex items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">
                                {match.homeTeamName}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-3 text-3xl font-black text-slate-900 dark:text-white">
                                <span>{match.homeScore ?? 0}</span>
                                <span className="text-slate-300 dark:text-slate-600 text-xl">-</span>
                                <span>{match.awayScore ?? 0}</span>
                            </div>
                            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                {match.status?.replace('_', ' ') || 'FULL TIME'}
                            </div>
                        </div>

                        <div className="flex-1 text-center">
                            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">
                                {match.awayTeamName}
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20 mt-2" />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
                {shareLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-transform hover:scale-105 active:scale-95 ${link.color}`}
                        aria-label={`Share on ${link.name}`}
                    >
                        {link.icon}
                    </a>
                ))}
                <button
                    onClick={handleCopy}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                    {copied ? <Check className="w-5 h-5 text-green-500" weight="bold" /> : <Copy className="w-5 h-5" />}
                </button>
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={url}
                    readOnly
                    aria-label="Match URL"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 outline-none"
                />
                <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
        </GlassCard>
    );
};
