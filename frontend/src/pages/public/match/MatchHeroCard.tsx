import {
    Clock,
    MapPin,
    CalendarBlank,
    ArrowsClockwise,
    Trophy
} from '@phosphor-icons/react';
import { PublicMatchDetail } from '../../../api/public.api';
import { ShareButton } from '@/components/common/ShareButton';

interface MatchHeroCardProps {
    match: PublicMatchDetail;
    lastUpdated: Date;
    tournamentName?: string;
}

export const MatchHeroCard = ({ match, lastUpdated, tournamentName }: MatchHeroCardProps) => {
    const isLive = match.status === 'LIVE' || match.status === 'ONGOING';
    const isCompleted = match.status === 'COMPLETED' || match.status === 'FULL_TIME';

    const formatMatchCode = (code?: string) => {
        if (!code) return null;
        if (code.length < 10) return code;
        const matchNumber = code.match(/-M(\d+)$/);
        if (matchNumber) {
            return `Match ${matchNumber[1]}`;
        }
        return null;
    };

    return (
        <div
            className={`
                relative overflow-hidden rounded-3xl 
                bg-white/70 dark:bg-slate-900/60 
                backdrop-blur-2xl 
                border-slate-200/50 dark:border-slate-700/50
                shadow-2xl shadow-blue-900/10 dark:shadow-black/40
                p-8 md:py-12 md:px-10
                border-t border-l
                transition-all duration-300
                border-[color:var(--brand-primary,hsl(var(--border)))]
                ${match.organiserBranding?.primaryColor ? 'border-[3px]' : 'border'}
            `}
        >
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl">
                {/* Home Team Glow (Left) */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[140%] bg-blue-500/10 dark:bg-blue-600/10 blur-[80px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
                {/* Away Team Glow (Right) */}
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[140%] bg-red-500/10 dark:bg-red-600/10 blur-[80px] rounded-full mix-blend-multiply dark:mix-blend-screen" />

                {/* Organiser Branding Tint */}
                {match.organiserBranding?.primaryColor && (
                    <div className="absolute inset-0 opacity-[0.03] bg-[color:var(--brand-primary)]" />
                )}
            </div>

            <div className="relative z-10 space-y-8">
                {/* Competition Badge & Status Row */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" weight="fill" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
                                {tournamentName || 'Tournament Match'}
                            </span>
                        </div>

                        {/* Match Code / Round Badge */}
                        {(match.stage || match.code) && (
                            <div className="hidden md:flex px-3 py-1.5 rounded-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 backdrop-blur-sm text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {[
                                    match.stage,
                                    match.round,
                                    formatMatchCode(match.code)
                                ].filter(Boolean).join(' • ')}
                            </div>
                        )}
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-3">
                        {isLive && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold border border-red-500/20 shadow-sm shadow-red-500/10">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                LIVE
                            </div>
                        )}
                        {isCompleted && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-sm font-bold border border-slate-200 dark:border-white/10">
                                FULL TIME
                            </div>
                        )}
                        {!isLive && !isCompleted && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold border border-blue-500/20">
                                <CalendarBlank className="w-4 h-4" weight="bold" />
                                SCHEDULED
                            </div>
                        )}

                        {/* Last Updated (Live only) */}
                        {isLive && (
                            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md">
                                <ArrowsClockwise className="w-3 h-3 animate-spin-slow" />
                                <span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Section */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-8 md:gap-12 py-2">
                    {/* Home Team */}
                    <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-3 md:space-y-4 group">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-inner flex items-center justify-center text-2xl font-bold text-slate-400 mb-2 md:hidden">
                            {match.homeTeamName.charAt(0)}
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:scale-[1.02] transition-transform duration-300">
                            {match.homeTeamName}
                        </h2>
                        <div className="h-1 w-12 bg-blue-500 rounded-full opacity-80 md:ml-0" />
                    </div>

                    {/* Score Board */}
                    <div className="relative flex items-center justify-center gap-6 md:gap-10 px-6 py-4 md:px-12 md:py-6 rounded-3xl bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                        <div className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-sm">
                            {match.homeScore ?? 0}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-px h-12 bg-slate-300 dark:bg-white/10" />
                            <span className="text-slate-400 font-medium text-sm md:text-base">VS</span>
                            <div className="w-px h-12 bg-slate-300 dark:bg-white/10" />
                        </div>
                        <div className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-sm">
                            {match.awayScore ?? 0}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 md:space-y-4 group">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-inner flex items-center justify-center text-2xl font-bold text-slate-400 mb-2 md:hidden">
                            {match.awayTeamName.charAt(0)}
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:scale-[1.02] transition-transform duration-300">
                            {match.awayTeamName}
                        </h2>
                        <div className="h-1 w-12 bg-red-500 rounded-full opacity-80 md:mr-0" />
                    </div>
                </div>

                {/* Meta Details Footer */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/50 dark:border-white/5">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <CalendarBlank className="w-4 h-4 text-blue-500" />
                            <span>{new Date(match.matchDate).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>{match.matchTime}</span>
                        </div>
                        {match.venue && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>{match.venue}</span>
                            </div>
                        )}
                    </div>

                    {/* Share Action */}
                    <ShareButton
                        title={`${match.homeTeamName} vs ${match.awayTeamName}`}
                        text={`Follow the match ${match.homeTeamName} vs ${match.awayTeamName} on AthleticaOS!`}
                        url={window.location.href}
                        variant="ghost"
                        className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    />
                </div>
            </div>
        </div>
    );
};
