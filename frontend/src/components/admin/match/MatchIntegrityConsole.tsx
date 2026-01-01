import { MatchEventItem } from '@/store/matches.store';
import { Warning, CheckCircle } from '@phosphor-icons/react';

interface MatchIntegrityConsoleProps {
    events: MatchEventItem[];
}

export const MatchIntegrityConsole = ({ events }: MatchIntegrityConsoleProps) => {
    // Mock Integrity Logic
    const validateEvent = (event: MatchEventItem) => {
        // Simple heuristic checks
        if (event.eventType === 'Try' || event.eventType === 'TRY') return { status: 'OK', msg: 'Valid' };
        return { status: 'OK', msg: 'Valid' };
    };

    const sortedEvents = [...(events || [])].sort((a, b) => (b.minute || 0) - (a.minute || 0));

    return (
        <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Integrity Audit Log</h3>
                <span className="text-xs text-slate-400">{sortedEvents.length} Events Logged</span>
            </div>

            <div className="h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {sortedEvents.map((event, idx) => {
                    const validation = validateEvent(event);
                    return (
                        <div key={event.id || idx} className={`p-2 rounded border flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-white/5
                            ${validation.status === 'WARNING' ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-100 dark:border-white/5'}
                        `}>
                            <div className="flex items-center gap-3">
                                <span className="w-8 text-center text-slate-400 font-bold">{event.minute}'</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {event.eventType}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {event.teamName} • {event.playerName || 'Unknown Player'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {validation.status === 'WARNING' ? (
                                    <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                                        <Warning weight="fill" />
                                        <span>{validation.msg}</span>
                                    </div>
                                ) : (
                                    <CheckCircle className="text-green-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
