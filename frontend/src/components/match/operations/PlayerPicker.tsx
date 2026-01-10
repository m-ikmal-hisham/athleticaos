
interface Player {
    id: string;
    number: number;
    name: string;
}

interface PlayerPickerProps {
    teamName: string;
    players: { starters: Player[], bench: Player[], other: Player[] };
    onSelect: (playerId: string) => void;
    onCancel: () => void;
    isSubstitution?: boolean;
    subStep?: 'OUT' | 'IN';
}

export const PlayerPicker = ({ teamName, players, onSelect, onCancel, isSubstitution, subStep }: PlayerPickerProps) => {

    const getTitle = () => {
        if (!isSubstitution) return 'Select Player';
        return subStep === 'OUT' ? 'Who is coming OFF?' : 'Who is coming ON?';
    };

    const renderGrid = (list: Player[], label: string) => {
        if (!list || list.length === 0) return null;
        return (
            <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">{label}</h4>
                <div className="grid grid-cols-4 gap-3">
                    {list.map(player => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            className={`
                                aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border
                                ${isSubstitution && subStep === 'OUT' ? 'bg-red-900/20 border-red-800 hover:bg-red-900/40 text-red-100' : ''}
                                ${isSubstitution && subStep === 'IN' ? 'bg-green-900/20 border-green-800 hover:bg-green-900/40 text-green-100' : ''}
                                ${!isSubstitution ? 'bg-slate-800 hover:bg-slate-700 active:bg-blue-600 border-slate-700 text-white' : ''}
                            `}
                        >
                            <span className="text-2xl font-black">{player.number}</span>
                            <span className="text-[10px] opacity-70 truncate max-w-full px-1">{player.name.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h3 className={`text-lg font-bold ${isSubstitution ? (subStep === 'OUT' ? 'text-red-400' : 'text-green-400') : 'text-white'}`}>
                            {getTitle()}
                        </h3>
                        <p className="text-sm text-slate-400">{teamName}</p>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white px-3 py-1">
                        Cancel
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {renderGrid(players.starters, "Starters")}
                    {renderGrid(players.bench, "Bench")}
                    {renderGrid(players.other, "Squad")}

                    {/* Unknown Player Option */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => onSelect('unknown')}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed flex items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <span className="font-bold text-slate-400">Unknown Player?</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
