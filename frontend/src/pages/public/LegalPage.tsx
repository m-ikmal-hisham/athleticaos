import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link } from 'react-router-dom';
import { LinkSimple, Check, List, X, WarningCircle } from '@phosphor-icons/react';
import { useLegalLanguage } from '@/hooks/useLegalLanguage';
import { privacyDocModule } from '@/content/legal/privacy';
import { termsDocModule } from '@/content/legal/terms';
import { isDocumentPublishable } from '@/content/legal/types';
import { formatDisplayDate } from '@/utils/formatters';

interface LegalPageProps {
    docType?: 'privacy' | 'terms';
}

function FormattedText({ text }: { text: string }) {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} className="font-semibold text-content-primary">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code
                            key={i}
                            className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-content-primary"
                        >
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                return part;
            })}
        </>
    );
}

export default function LegalPage({ docType }: LegalPageProps) {
    const location = useLocation();
    const resolvedType = docType || (location.pathname.includes('terms') ? 'terms' : 'privacy');
    const docModule = resolvedType === 'terms' ? termsDocModule : privacyDocModule;

    const { language, setLanguage } = useLegalLanguage();
    const currentDoc = language === 'ms' ? docModule.ms : docModule.en;

    const [activeSectionId, setActiveSectionId] = useState<string>('');
    const [tocSheetOpen, setTocSheetOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    // Set when the clipboard is unavailable: the link is put in the address bar instead
    const [linkInBarId, setLinkInBarId] = useState<string | null>(null);

    const isProd = import.meta.env.VITE_ENV === 'production';
    const publishable = isDocumentPublishable(docModule);

    // Set page title
    useEffect(() => {
        document.title = resolvedType === 'terms'
            ? 'Terms of use — AthleticaOS'
            : 'Privacy notice — AthleticaOS';
    }, [resolvedType]);

    // Handle scroll spy for table of contents
    useEffect(() => {
        const handleScroll = () => {
            const sectionElements = currentDoc.sections
                .map((sec) => document.getElementById(sec.id))
                .filter(Boolean) as HTMLElement[];

            if (!sectionElements.length) return;

            const scrollPosition = window.scrollY + 120;
            let current = sectionElements[0].id;

            for (const el of sectionElements) {
                if (el.offsetTop <= scrollPosition) {
                    current = el.id;
                } else {
                    break;
                }
            }

            setActiveSectionId(current);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentDoc]);

    // Scroll to initial hash if present
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const target = document.getElementById(id);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [location.hash]);

    const copySectionLink = async (sectionId: string) => {
        const url = new URL(window.location.href);
        url.hash = sectionId;
        const linkStr = url.toString();

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(linkStr);
                setCopiedId(sectionId);
                setTimeout(() => setCopiedId(null), 2000);
                return;
            }
        } catch {
            // Clipboard API failed or not permitted
        }

        try {
            window.history.pushState(null, '', `#${sectionId}`);
            setLinkInBarId(sectionId);
            setTimeout(() => setLinkInBarId(null), 3000);
        } catch {
            // Fail silently without throwing
        }
    };

    const scrollToSection = (sectionId: string) => {
        setTocSheetOpen(false);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', `#${sectionId}`);
        }
    };

    // Production gate for unpublishable draft documents
    if (isProd && !publishable) {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 text-center">
                <h1 className="text-2xl font-bold text-content-primary mb-3">
                    This page is being updated.
                </h1>
                <p className="text-content-secondary mb-6 text-sm">
                    Please check back soon, or contact us if you have any questions.
                </p>
                <Link
                    to="/contact"
                    className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl font-semibold bg-brand text-white hover:bg-brand-hover transition-colors text-sm"
                >
                    Contact us
                </Link>
            </div>
        );
    }

    const isDraft = docModule.status === 'draft' || docModule.placeholdersPresent;

    return (
        <div className="legal-page-container">
            {/* Print styles */}
            <style>{`
                @media print {
                    nav, footer, .legal-print-hide, .tournament-pill-container {
                        display: none !important;
                    }
                    body, .legal-page-container {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .legal-content {
                        max-width: 100% !important;
                    }
                }
            `}</style>

            {/* Draft Banner for dev / staging */}
            {isDraft && (
                <div className="legal-print-hide mb-8 p-4 rounded-xl border border-crimson dark:border-crimson-tint bg-crimson/5 flex items-center gap-3 text-sm text-crimson dark:text-crimson-tint font-medium">
                    <WarningCircle size={20} className="shrink-0" />
                    <span>Draft — under review</span>
                </div>
            )}

            {/* Header: Title, Last Updated, Language Switch */}
            <header className="mb-8 pb-6 border-b border-line-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-content-primary mb-2">
                            {currentDoc.title}
                        </h1>
                        <p className="text-sm text-content-secondary">
                            {language === 'ms' ? 'Kemas kini terakhir: ' : 'Last updated: '}
                            <time dateTime={docModule.lastUpdated}>
                                {formatDisplayDate(docModule.lastUpdated)}
                            </time>
                        </p>
                    </div>

                    {/* Language Switch Segmented Control */}
                    <div className="legal-print-hide inline-flex items-center p-1 rounded-xl bg-surface-sunken border border-line-subtle self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`min-h-[36px] min-w-[44px] px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                language === 'en'
                                    ? 'bg-brand text-white shadow-sm'
                                    : 'text-content-secondary hover:text-content-primary'
                            }`}
                            aria-pressed={language === 'en'}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('ms')}
                            className={`min-h-[36px] min-w-[44px] px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                language === 'ms'
                                    ? 'bg-brand text-white shadow-sm'
                                    : 'text-content-secondary hover:text-content-primary'
                            }`}
                            aria-pressed={language === 'ms'}
                        >
                            BM
                        </button>
                    </div>
                </div>

                {/* Mobile / Tablet Contents button under header */}
                <div className="legal-print-hide lg:hidden mt-6">
                    <button
                        type="button"
                        onClick={() => setTocSheetOpen(true)}
                        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-line-strong bg-surface-card text-content-primary text-sm font-semibold hover:bg-surface-sunken transition-colors"
                        aria-label="Open table of contents"
                    >
                        <List size={20} />
                        <span>Contents</span>
                    </button>
                </div>
            </header>

            {/* Layout: Sidebar TOC (Desktop) + Article Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                {/* Desktop Sticky Table of Contents */}
                <aside className="legal-print-hide hidden lg:block lg:col-span-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4">
                    <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">
                        {language === 'ms' ? 'Kandungan' : 'Contents'}
                    </div>
                    <nav className="space-y-1">
                        {currentDoc.sections.map((section) => {
                            const isActive = activeSectionId === section.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                        isActive
                                            ? 'bg-brand/10 text-brand-text font-semibold'
                                            : 'text-content-secondary hover:text-content-primary hover:bg-surface-sunken'
                                    }`}
                                >
                                    <span className="truncate">{section.heading}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Legal Article Content */}
                <article
                    lang={language}
                    className="legal-content lg:col-span-8 lg:max-w-[72ch] text-content-primary leading-relaxed space-y-10"
                >
                    {currentDoc.sections.map((section) => (
                        <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                            <div className="flex items-center justify-between gap-2 group pt-2 border-t border-line-subtle first:border-t-0">
                                <h2 className="text-lg sm:text-xl font-bold text-content-primary">
                                    {section.heading}
                                </h2>
                                {linkInBarId === section.id && (
                                    <span role="status" className="legal-print-hide ml-auto text-xs text-content-secondary">
                                        {language === 'ms' ? 'Pautan ada di bar alamat' : 'Link is in the address bar'}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => copySectionLink(section.id)}
                                    className="legal-print-hide min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-sunken transition-colors"
                                    aria-label="Copy link to section"
                                    title="Copy link to section"
                                >
                                    {copiedId === section.id ? (
                                        <Check size={18} className="text-brand-text" />
                                    ) : (
                                        <LinkSimple size={18} />
                                    )}
                                </button>
                            </div>

                            <div className="space-y-3 text-sm sm:text-base text-content-primary/90">
                                {section.body.map((block, idx) => {
                                    if (block.type === 'p') {
                                        return (
                                            <p key={idx} className="leading-relaxed">
                                                <FormattedText text={block.text} />
                                            </p>
                                        );
                                    }
                                    if (block.type === 'ul') {
                                        return (
                                            <ul key={idx} className="list-disc list-outside pl-5 space-y-2">
                                                {block.items.map((item, itemIdx) => (
                                                    <li key={itemIdx} className="leading-relaxed">
                                                        <FormattedText text={item} />
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    }
                                    if (block.type === 'table') {
                                        return (
                                            <div key={idx} className="my-4">
                                                {/* Desktop table view (>= lg) */}
                                                <div className="hidden lg:block overflow-x-auto rounded-xl border border-line-subtle">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-surface-sunken border-b border-line-subtle">
                                                            <tr>
                                                                {block.headers.map((h, hIdx) => (
                                                                    <th
                                                                        key={hIdx}
                                                                        className="p-3 font-semibold text-content-primary"
                                                                    >
                                                                        <FormattedText text={h} />
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-line-subtle bg-surface-card">
                                                            {block.rows.map((row, rIdx) => (
                                                                <tr key={rIdx} className="hover:bg-surface-sunken/50 transition-colors">
                                                                    {row.map((cell, cIdx) => (
                                                                        <td key={cIdx} className="p-3 align-top">
                                                                            <FormattedText text={cell} />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Mobile / Tablet stacked cards (< lg) */}
                                                <div className="lg:hidden space-y-3">
                                                    {block.rows.map((row, rIdx) => (
                                                        <div
                                                            key={rIdx}
                                                            className="rounded-xl border border-line-subtle bg-surface-card p-4 space-y-2"
                                                        >
                                                            {row.map((cell, cIdx) => (
                                                                <div key={cIdx}>
                                                                    <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-0.5">
                                                                        <FormattedText text={block.headers[cIdx] || ''} />
                                                                    </div>
                                                                    <div className="text-sm text-content-primary">
                                                                        <FormattedText text={cell} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </section>
                    ))}
                </article>
            </div>

            {/* Mobile Bottom Sheet for Table of Contents */}
            {/* Portalled to body: <main> is its own stacking context (z-10), so the sheet must escape it to sit above the TournamentPill (z-40) */}
            {tocSheetOpen && createPortal(
                <div className="legal-print-hide fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setTocSheetOpen(false)}
                    />

                    {/* Bottom Sheet */}
                    <div className="fixed inset-x-0 bottom-0 bg-surface-card border-t border-line-subtle rounded-t-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl z-10 animate-slide-up">
                        <div className="flex items-center justify-between pb-4 border-b border-line-subtle mb-4">
                            <span className="text-base font-bold text-content-primary">
                                {language === 'ms' ? 'Kandungan' : 'Contents'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTocSheetOpen(false)}
                                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2 rounded-lg text-content-secondary hover:text-content-primary"
                                aria-label="Close contents"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-1 pb-6">
                            {currentDoc.sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className="w-full text-left min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-content-primary hover:bg-surface-sunken flex items-center justify-between"
                                >
                                    <span>{section.heading}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
