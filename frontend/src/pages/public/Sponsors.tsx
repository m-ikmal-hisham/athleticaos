import { SponsorsSection } from '@/components/public/SponsorsSection';

export default function Sponsors() {
    return (
        <div className="max-w-7xl mx-auto py-12 px-4">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    Our Partners
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Powering the future of Malaysian Rugby.
                </p>
            </div>

            <SponsorsSection />
        </div>
    );
}
