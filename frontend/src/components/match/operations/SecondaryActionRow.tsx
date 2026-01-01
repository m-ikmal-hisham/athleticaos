import { ArrowsLeftRight, Ambulance, NotePencil } from '@phosphor-icons/react';

interface SecondaryActionRowProps {
    onAction: (action: 'SUBSTITUTION' | 'INJURY' | 'NOTE') => void;
    disabled?: boolean;
}

export const SecondaryActionRow = ({ onAction, disabled }: SecondaryActionRowProps) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            <button
                onClick={() => onAction('SUBSTITUTION')}
                disabled={disabled}
                className="bg-slate-800 active:bg-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-700 transition"
            >
                <ArrowsLeftRight className="w-6 h-6" />
                <span className="text-sm font-bold uppercase">Sub</span>
            </button>

            <button
                onClick={() => onAction('INJURY')}
                disabled={disabled}
                className="bg-slate-800 active:bg-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-700 transition"
            >
                <Ambulance className="w-6 h-6" />
                <span className="text-sm font-bold uppercase">Injury</span>
            </button>

            <button
                onClick={() => onAction('NOTE')}
                disabled={disabled}
                className="bg-slate-800 active:bg-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-700 transition"
            >
                <NotePencil className="w-6 h-6" />
                <span className="text-sm font-bold uppercase">Note</span>
            </button>
        </div>
    );
};
