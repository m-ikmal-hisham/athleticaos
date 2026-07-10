import { HandPalm, Warning, Cardholder } from '@phosphor-icons/react';

interface PrimaryActionGridProps {
    onAction: (action: 'TRY' | 'CONVERSION' | 'PENALTY' | 'DROP_GOAL' | 'PENALTY_TRY' | 'YELLOW_CARD' | 'RED_CARD') => void;
    disabled?: boolean;
}

export const PrimaryActionGrid = ({ onAction, disabled }: PrimaryActionGridProps) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-auto md:h-64">
            {/* Try - Large Priority */}
            <button
                onClick={() => onAction('TRY')}
                disabled={disabled}
                className="col-span-2 md:col-span-2 bg-blue-600 active:bg-blue-700 hover:bg-blue-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-32 md:h-full"
            >
                <HandPalm className="w-10 h-10 md:w-12 md:h-12" weight="fill" />
                <span className="text-2xl font-black uppercase tracking-wider">TRY</span>
                <span className="text-sm opacity-75 font-mono">+5 PTS</span>
            </button>

            {/* Conversion */}
            <button
                onClick={() => onAction('CONVERSION')}
                disabled={disabled}
                className="col-span-1 bg-indigo-600 active:bg-indigo-700 hover:bg-indigo-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-32 md:h-full"
            >
                <span className="text-lg font-bold uppercase tracking-wider text-center leading-tight">Conv</span>
                <span className="text-sm opacity-75 font-mono">+2 PTS</span>
            </button>

            {/* Penalty Goal */}
            <button
                onClick={() => onAction('PENALTY')}
                disabled={disabled}
                className="col-span-1 bg-purple-600 active:bg-purple-700 hover:bg-purple-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-32 md:h-full"
            >
                <Warning className="w-8 h-8" weight="bold" />
                <span className="text-lg font-bold uppercase tracking-wider text-center leading-tight">Penalty</span>
                <span className="text-sm opacity-75 font-mono">+3 PTS</span>
            </button>

            {/* Drop Goal */}
            <button
                onClick={() => onAction('DROP_GOAL')}
                disabled={disabled}
                className="col-span-1 bg-teal-600 active:bg-teal-700 hover:bg-teal-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-24 md:h-auto"
            >
                <span className="text-sm font-bold uppercase tracking-wider text-center leading-tight">Drop Goal</span>
                <span className="text-xs opacity-75 font-mono">+3 PTS</span>
            </button>

            {/* Penalty Try */}
            <button
                onClick={() => onAction('PENALTY_TRY')}
                disabled={disabled}
                className="col-span-1 bg-blue-800 active:bg-blue-900 hover:bg-blue-700 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-24 md:h-auto"
            >
                <span className="text-sm font-bold uppercase tracking-wider text-center leading-tight">Penalty Try</span>
                <span className="text-xs opacity-75 font-mono">+7 PTS</span>
            </button>

            {/* Cards */}
            <button
                onClick={() => onAction('YELLOW_CARD')}
                disabled={disabled}
                className="col-span-1 bg-yellow-500 active:bg-yellow-600 hover:bg-yellow-400 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-24 md:h-auto"
            >
                <Cardholder className="w-6 h-6" weight="fill" />
                <span className="text-sm font-bold uppercase tracking-wider">Yellow</span>
            </button>

            <button
                onClick={() => onAction('RED_CARD')}
                disabled={disabled}
                className="col-span-1 bg-red-600 active:bg-red-700 hover:bg-red-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 touch-manipulation h-24 md:h-auto"
            >
                <Cardholder className="w-6 h-6" weight="fill" />
                <span className="text-sm font-bold uppercase tracking-wider">Red Card</span>
            </button>
        </div>
    );
};
