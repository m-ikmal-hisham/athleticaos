import { useState } from 'react';
import { CaretDown, CaretUp, Trophy, MonitorPlay, ShareNetwork } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';

export default function HowItWorks() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-16">
            {/* Header */}
            <div className="text-center space-y-6">
                <span className="text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-sm">AthleticaOS Guide</span>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    Experience Rugby Like Never Before
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Follow your favourite tournaments, catch live scores, and stay updated with real-time statistics.
                </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-8">
                <StepCard
                    icon={<Trophy className="w-8 h-8 text-amber-500" weight="fill" />}
                    title="1. Browse Tournaments"
                    description="Explore active and upcoming tournaments across Malaysia. Find your team's schedule and standings."
                />
                <StepCard
                    icon={<MonitorPlay className="w-8 h-8 text-red-500" weight="fill" />}
                    title="2. Follow Live Matches"
                    description="Watch the action unfold with our live match center. Real-time scores, commentary, and statistics."
                />
                <StepCard
                    icon={<ShareNetwork className="w-8 h-8 text-blue-500" weight="fill" />}
                    title="3. Share the Excitement"
                    description="Share match results and highlights with friends and family instantly on social media."
                />
            </div>

            {/* FAQ Section */}
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-4">
                    <FAQItem
                        question="Is AthleticaOS free to use?"
                        answer="Yes! AthleticaOS is completely free for fans to browse tournaments, view scores, and follow matches."
                    />
                    <FAQItem
                        question="How do I register my team?"
                        answer="Team registration is handled by tournament organisers. Contact the specific tournament organiser through the Contact page to inquire."
                    />
                    <FAQItem
                        question="Can I watch match replays?"
                        answer="Live streams and replays are available for select tournaments. Look for the 'Live' badge on match cards."
                    />
                </div>
            </div>
        </div>
    );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <GlassCard className="p-8 text-center space-y-4 h-full hover:scale-105 transition-transform duration-300">
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
        <GlassCard className="overflow-hidden transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className="font-bold text-slate-900 dark:text-white">{question}</span>
                {isOpen ? <CaretUp className="w-4 h-4 text-slate-500" /> : <CaretDown className="w-4 h-4 text-slate-500" />}
            </button>
            <div
                className={`px-6 text-slate-600 dark:text-slate-400 leading-relaxed transition-all duration-300 ${isOpen ? 'pb-6 max-h-40 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
                {answer}
            </div>
        </GlassCard>
    );
}
