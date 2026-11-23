import { useTranslation } from 'react-i18next';
import { CheckCircle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { CertificateDesign } from '@/api/certificates.api';

interface CertificateDesignPickerProps {
    value: CertificateDesign;
    onChange: (design: CertificateDesign) => void;
    organiserPrimaryColor?: string | null;
    organiserSecondaryColor?: string | null;
}

const DESIGNS: CertificateDesign[] = [
    'CLASSIC',
    'MODERN',
    'ORGANISER_COLOURS',
    'PITCH',
    'PRINT_SAVER',
    'SONGKET_GOLD',
    'HIBISCUS_ENERGY',
    'PITCH_DYNAMIC',
    'STADIUM_LIGHTS',
    'BATIK_WAVE',
    'CHAMPIONS_RIBBON',
];

// Artwork designs: the thumbnail is a small copy of the background the PDF uses
// (public/certificates/<id>.jpg; full-size originals in backend templates/certificates/backgrounds).
const ARTWORK_THUMBNAILS: Partial<Record<CertificateDesign, string>> = {
    SONGKET_GOLD: '/certificates/songket_gold.jpg',
    HIBISCUS_ENERGY: '/certificates/hibiscus_energy.jpg',
    PITCH_DYNAMIC: '/certificates/pitch_dynamic.jpg',
    STADIUM_LIGHTS: '/certificates/stadium_lights.jpg',
    BATIK_WAVE: '/certificates/batik_wave.jpg',
    CHAMPIONS_RIBBON: '/certificates/champions_ribbon.jpg',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function safeHex(val: string | null | undefined, fallback: string): string {
    return val && HEX_RE.test(val.trim()) ? val.trim() : fallback;
}

function DesignThumbnail({
    design,
    primary,
    secondary,
}: {
    design: CertificateDesign;
    primary: string;
    secondary: string;
}) {
    const artwork = ARTWORK_THUMBNAILS[design];
    if (artwork) {
        return (
            <div className="relative w-full aspect-[297/210] rounded border border-slate-200 overflow-hidden bg-white">
                <img src={artwork} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="relative z-10 h-full p-2 flex flex-col items-center justify-center">
                    <div className="w-2/3 h-1.5 bg-slate-800/80 rounded-sm mb-1.5" />
                    <div className="w-1/2 h-2 bg-slate-900 rounded-sm mb-1.5" />
                    <div className="w-1/3 h-1.5 bg-slate-500/70 rounded-full" />
                </div>
            </div>
        );
    }

    if (design === 'CLASSIC') {
        return (
            <div className="relative w-full aspect-[297/210] bg-white rounded border-[3px] border-double border-[#b8913a] p-2 flex flex-col items-center justify-center text-center overflow-hidden">
                <div className="absolute inset-1.5 border border-[#b8913a]/70 pointer-events-none" />
                <div className="w-2/3 h-1.5 bg-[#1f2937] rounded-sm mb-1.5" />
                <div className="w-1/2 h-2 bg-[#13284f] rounded-sm border-b border-[#b8913a] mb-1.5" />
                <div className="w-1/3 h-1.5 bg-[#f7efdc] rounded-full mb-2" />
                <div className="w-4/5 flex justify-between items-end mt-auto pt-1">
                    <div className="w-5 h-0.5 bg-slate-400" />
                    <div className="w-2.5 h-2.5 border border-slate-700" />
                    <div className="w-5 h-0.5 bg-slate-400" />
                </div>
            </div>
        );
    }

    if (design === 'MODERN') {
        return (
            <div className="relative w-full aspect-[297/210] bg-white rounded border border-slate-200 overflow-hidden flex">
                <div className="w-[10%] h-full bg-[#13284f] relative shrink-0">
                    <div className="w-full h-[30%] bg-[#c8102e]" />
                </div>
                <div className="flex-1 p-2 flex flex-col justify-center items-start">
                    <div className="w-3/4 h-1.5 bg-[#13284f] rounded-sm mb-1.5" />
                    <div className="w-2/3 h-2 bg-slate-900 rounded-sm mb-1.5" />
                    <div className="w-1/3 h-1.5 bg-[#e8eefb] rounded-full mb-2" />
                    <div className="w-full flex justify-between items-end mt-auto">
                        <div className="flex gap-2">
                            <div className="w-4 h-0.5 bg-slate-400" />
                            <div className="w-4 h-0.5 bg-slate-400" />
                        </div>
                        <div className="w-2.5 h-2.5 border border-slate-700" />
                    </div>
                </div>
            </div>
        );
    }

    if (design === 'ORGANISER_COLOURS') {
        return (
            <div
                className="relative w-full aspect-[297/210] rounded border border-slate-200 overflow-hidden p-1.5"
                style={{
                    background: `linear-gradient(135deg, ${primary} 0 22%, #f8fafc 22% 78%, ${secondary} 78%)`,
                }}
            >
                <div className="w-full h-full bg-white rounded-sm p-1.5 flex flex-col items-center justify-center">
                    <div className="w-2/3 h-1.5 rounded-sm mb-1.5" style={{ backgroundColor: primary }} />
                    <div className="w-1/2 h-2 bg-slate-900 rounded-sm mb-1.5" />
                    <div className="w-1/3 h-1.5 rounded-full mb-2" style={{ backgroundColor: secondary }} />
                    <div className="w-4/5 flex justify-between items-end mt-auto">
                        <div className="w-4 h-0.5 bg-slate-400" />
                        <div className="w-2.5 h-2.5 border border-slate-700" />
                        <div className="w-4 h-0.5 bg-slate-400" />
                    </div>
                </div>
            </div>
        );
    }

    if (design === 'PITCH') {
        return (
            <div className="relative w-full aspect-[297/210] bg-[#f4faf6] rounded border border-[#cfe7d8] p-2 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-1.5 border border-[#cfe7d8] pointer-events-none" />
                <div className="absolute top-1.5 bottom-1.5 left-1/2 border-l border-[#cfe7d8] pointer-events-none" />
                <div className="absolute top-1.5 bottom-1.5 left-[24%] border-l border-dashed border-[#cfe7d8] pointer-events-none" />
                <div className="absolute top-1.5 bottom-1.5 right-[24%] border-l border-dashed border-[#cfe7d8] pointer-events-none" />
                <div className="relative z-10 w-2/3 h-1.5 bg-[#1f6f43] rounded-sm mb-1.5" />
                <div className="relative z-10 w-1/2 h-2 bg-slate-900 rounded-sm mb-1.5" />
                <div className="relative z-10 w-1/3 h-1.5 bg-[#1f6f43] rounded-full mb-2" />
                <div className="relative z-10 w-4/5 flex justify-between items-end mt-auto">
                    <div className="w-4 h-0.5 bg-slate-400" />
                    <div className="w-2.5 h-2.5 border border-slate-700" />
                    <div className="w-4 h-0.5 bg-slate-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-[297/210] bg-white rounded border border-slate-300 p-2 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-1.5 border border-slate-300 pointer-events-none" />
            <div className="w-2/3 h-1.5 bg-slate-900 rounded-sm mb-1.5" />
            <div className="w-1/2 h-2 bg-slate-900 rounded-sm mb-1.5" />
            <div className="w-1/3 h-1.5 border border-slate-800 rounded-full mb-2" />
            <div className="w-4/5 flex justify-between items-end mt-auto">
                <div className="w-4 h-0.5 bg-slate-400" />
                <div className="w-2.5 h-2.5 border border-slate-700" />
                <div className="w-4 h-0.5 bg-slate-400" />
            </div>
        </div>
    );
}

export function CertificateDesignPicker({
    value,
    onChange,
    organiserPrimaryColor,
    organiserSecondaryColor,
}: CertificateDesignPickerProps) {
    const { t } = useTranslation('certificates');
    const primary = safeHex(organiserPrimaryColor, '#13284f');
    const secondary = safeHex(organiserSecondaryColor, '#c8102e');

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3" role="radiogroup" aria-label={t('design.heading')}>
            {DESIGNS.map((design) => {
                const selected = value === design;
                return (
                    <button
                        key={design}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(design)}
                        className={clsx(
                            'group text-left p-2.5 rounded-xl border transition-all flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                            selected
                                ? 'border-navy dark:border-navy-tint bg-navy/5 dark:bg-white/10 ring-1 ring-navy/30 dark:ring-navy-tint/40'
                                : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-navy/40 dark:hover:border-white/25'
                        )}
                    >
                        <DesignThumbnail design={design} primary={primary} secondary={secondary} />
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground truncate">
                                {t(`design.${design}.name`)}
                            </span>
                            {selected && (
                                <CheckCircle className="w-4 h-4 text-navy dark:text-navy-tint shrink-0" weight="fill" />
                            )}
                        </div>
                        <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
                            {t(`design.${design}.desc`)}
                        </p>
                    </button>
                );
            })}
        </div>
    );
}
