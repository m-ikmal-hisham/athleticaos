import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { DownloadSimple, Image, VideoCamera } from '@phosphor-icons/react';
import { getMatchMedia, MediaAsset } from '@/api/media.api';
import { toast } from 'react-hot-toast';

export const MediaPortal = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (matchId) {
            loadMedia(matchId);
        }
    }, [matchId]);

    const loadMedia = async (id: string) => {
        try {
            const data = await getMatchMedia(id);
            setAssets(data);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load media assets');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading media assets...</div>;

    if (!matchId) return <div className="p-8 text-center">Select a match to view media</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600">
                        Media Portal
                    </h1>
                    <p className="text-muted mt-2">Secure access for authorized media partners</p>
                </div>
                <div className="text-sm bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full border border-primary-500/20">
                    Partner Access
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 bg-glass-panel rounded-2xl border border-glass-border">
                    <Image className="w-16 h-16 mx-auto mb-4 text-muted/50" />
                    <h3 className="text-xl font-semibold mb-2">No Media Available</h3>
                    <p className="text-muted">No assets have been uploaded for this match yet.</p>
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
                                        <DownloadSimple className="mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {asset.type === 'PHOTO' ? <Image className="w-4 h-4 text-blue-400" /> : <VideoCamera className="w-4 h-4 text-red-400" />}
                                            <span className="text-xs font-medium text-muted">{asset.type}</span>
                                        </div>
                                        <p className="text-sm font-medium">{asset.description || 'Untitled Asset'}</p>
                                    </div>
                                    <span className="text-xs text-muted">
                                        {new Date(asset.uploadedAt).toLocaleDateString()}
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
