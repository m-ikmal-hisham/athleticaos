import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CaretDown, CaretUp, Trophy, MonitorPlay, ShareNetwork } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';

export default function HowItWorks() {
    const { t } = useTranslation('journey');
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-16">
            {/* Header */}
            <div className="text-center space-y-6">
                <span className="text-navy dark:text-navy-tint font-bold tracking-wider uppercase text-sm">{t('howItWorks.tag')}</span>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {t('howItWorks.title')}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    {t('howItWorks.subtitle')}
                </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-8">
                <StepCard
                    icon={<Trophy className="w-8 h-8" />}
                    title={t('howItWorks.step1Title')}
                    description={t('howItWorks.step1Desc')}
                />
                <StepCard
                    icon={<MonitorPlay className="w-8 h-8 text-crimson dark:text-crimson-tint" />}
                    title={t('howItWorks.step2Title')}
                    description={t('howItWorks.step2Desc')}
                />
                <StepCard
                    icon={<ShareNetwork className="w-8 h-8 text-navy dark:text-navy-tint" />}
                    title={t('howItWorks.step3Title')}
                    description={t('howItWorks.step3Desc')}
                />
            </div>

            {/* FAQ Section */}
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('howItWorks.faqTitle')}</h2>
                </div>
                <div className="space-y-4">
                    <FAQItem
                        question={t('howItWorks.faq1Q')}
                        answer={t('howItWorks.faq1A')}
                    />
                    <FAQItem
                        question={t('howItWorks.faq2Q')}
                        answer={t('howItWorks.faq2A')}
                    />
                    <FAQItem
                        question={t('howItWorks.faq3Q')}
                        answer={t('howItWorks.faq3A')}
                    />
                </div>
            </div>

            {/* Link to /journey */}
            <div className="text-center pt-8 border-t border-black/10 dark:border-white/12">
                <p className="text-sm text-black/72 dark:text-white/72">
                    {t('howItWorks.journeyPrompt')}{' '}
                    <Link
                        to="/journey"
                        className="font-semibold text-navy dark:text-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint rounded-sm"
                    >
                        {t('howItWorks.journeyLink')}
                    </Link>
                </p>
            </div>
        </div>
    );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <GlassCard surface="glass" hover className="p-8 text-center space-y-4 h-full">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
            </p>
        </GlassCard>
    );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <GlassCard surface="glass" className="overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className="font-bold text-slate-900 dark:text-white">{question}</span>
                {isOpen ? <CaretUp className="w-4 h-4 text-black/60 dark:text-white/60" /> : <CaretDown className="w-4 h-4 text-black/60 dark:text-white/60" />}
            </button>
            <div
                className={`px-6 text-slate-600 dark:text-slate-400 leading-relaxed transition-all duration-300 ${isOpen ? 'pb-6 max-h-40 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
                {answer}
            </div>
        </GlassCard>
    );
}
