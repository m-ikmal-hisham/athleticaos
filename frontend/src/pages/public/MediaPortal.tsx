import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { DownloadSimple, Image, VideoCamera } from '@phosphor-icons/react';
import { getMatchMedia, MediaAsset } from '@/api/media.api';
import { showToast } from '@/lib/customToast';
import { getDateLocale } from '@/utils/malaysiaDate';

export const MediaPortal = () => {
    const { t, i18n } = useTranslation('media');
    const { matchId } = useParams<{ matchId: string }>();
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!matchId) return;

        const loadMedia = async (id: string) => {
            try {
                const data = await getMatchMedia(id);
                setAssets(data);
            } catch (e) {
                console.error(e);
                showToast.error(t('loadError'));
            } finally {
                setLoading(false);
            }
        };

        loadMedia(matchId);
    }, [matchId, t]);

    if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

    if (!matchId) return <div className="p-8 text-center">{t('selectMatch')}</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">
                        {t('title')}
                    </h1>
                    <p className="text-black/72 dark:text-white/72 mt-2">{t('subtitle')}</p>
                </div>
                <div className="text-sm bg-navy/10 text-navy dark:bg-navy-tint/15 dark:text-navy-tint px-3 py-1 rounded-full border border-navy/20 dark:border-navy-tint/30">
                    {t('partnerAccess')}
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 bg-glass-panel rounded-2xl border border-glass-border">
                    <Image className="w-16 h-16 mx-auto mb-4 text-muted/50" />
                    <h3 className="text-xl font-semibold mb-2">{t('emptyTitle')}</h3>
                    <p className="text-muted">{t('emptyDescription')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map((asset) => (
                        <Card key={asset.id} className="overflow-hidden group">
                            <div className="aspect-video bg-black/50 relative overflow-hidden">
                                {asset.type === 'PHOTO' ? (
                                    <img
                                        src={asset.url}
                                        alt={asset.description}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <VideoCamera className="w-12 h-12 text-white/50" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button variant="secondary" size="sm">
                                        <DownloadSimple className="w-4 h-4 mr-2" />
                                        {t('download')}
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {asset.type === 'PHOTO' ? <Image className="w-4 h-4 text-navy dark:text-navy-tint" /> : <VideoCamera className="w-4 h-4 text-crimson dark:text-crimson-tint" />}
                                            <span className="text-xs font-medium text-muted">{asset.type}</span>
                                        </div>
                                        <p className="text-sm font-medium">{asset.description || t('untitledAsset')}</p>
                                    </div>
                                    <span className="text-xs text-muted">
                                        {format(new Date(asset.uploadedAt), 'd MMM yyyy', { locale: getDateLocale(i18n.language) })}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
