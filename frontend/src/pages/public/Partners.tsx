import { useTranslation } from 'react-i18next';
import { PartnersSection } from '@/components/public/PartnersSection';

export default function Partners() {
    const { t } = useTranslation('common');

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 space-y-2">
                <h1 className="font-score text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
                    {t('partners.title')}
                </h1>
                <p className="text-base sm:text-lg text-black/70 dark:text-white/70 max-w-2xl mx-auto">
                    {t('partners.subtitle')}
                </p>
            </div>

            <PartnersSection showHeading={false} />
        </div>
    );
}
