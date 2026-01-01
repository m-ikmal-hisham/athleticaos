
interface Player {
    id: string;
    number: number;
    name: string;
}

interface PlayerPickerProps {
    teamName: string;
    players: Player[];
    onSelect: (playerId: string) => void;
    onCancel: () => void;
}

export const PlayerPicker = ({ teamName, players, onSelect, onCancel }: PlayerPickerProps) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Select Player</h3>
                        <p className="text-sm text-slate-400">{teamName}</p>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white px-3 py-1">
                        Cancel
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3">
                    {players.map(player => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            className="aspect-square rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 border border-slate-700 flex flex-col items-center justify-center gap-1 transition-colors"
                        >
                            <span className="text-2xl font-black text-white">{player.number}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-full px-1">{player.name.split(' ')[0]}</span>
                        </button>
                    ))}
                    <button
                        onClick={() => onSelect('unknown')}
                        className="aspect-square rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed flex flex-col items-center justify-center gap-1 opacity-50"
                    >
                        <span className="text-xl font-bold text-slate-500">?</span>
                        <span className="text-[10px] text-slate-500">Unknown</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
