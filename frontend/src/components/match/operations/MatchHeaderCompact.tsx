import { Clock, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { PublicMatchDetail } from '@/api/public.api';

interface MatchHeaderCompactProps {
    match: PublicMatchDetail;
    isOnline: boolean;
    lastSynced?: Date;
    matchTime: string;
}

export const MatchHeaderCompact = ({ match, isOnline, matchTime }: MatchHeaderCompactProps) => {
    return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex items-center justify-between sticky top-2 z-50 border border-slate-800">
            {/* Home Team */}
            <div className="flex flex-col items-center w-1/4">
                <span className="text-xl font-bold truncate max-w-full">{match.homeTeamName}</span>
                <span className="text-3xl font-black text-blue-400">{match.homeScore}</span>
            </div>

            {/* Clock & Status */}
            <div className="flex flex-col items-center flex-1">
                <div className="bg-slate-800 px-4 py-1 rounded-full flex items-center gap-2 mb-1 border border-slate-700">
                    <Clock className="w-4 h-4 text-green-400" weight="fill" />
                    <span className="text-lg font-mono font-bold tracking-widest text-green-400">
                        {matchTime}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    {isOnline ? (
                        <WifiHigh className="w-3 h-3 text-green-500" />
                    ) : (
                        <WifiSlash className="w-3 h-3 text-red-500" />
                    )}
                    <span>{match.status}</span>
                </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center w-1/4">
                <span className="text-xl font-bold truncate max-w-full">{match.awayTeamName}</span>
                <span className="text-3xl font-black text-red-400">{match.awayScore}</span>
            </div>
        </div>
    );
};
