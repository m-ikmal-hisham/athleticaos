import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/Card';
import { Button } from '@/components/Button';
import { Check } from '@phosphor-icons/react';
import { getSubscriptionTiers, SubscriptionTier } from '@/api/monetization.api';
import { toast } from 'react-hot-toast';

export const SubscriptionManagement = () => {
    const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

    useEffect(() => {
        const loadTiers = async () => {
            try {
                const data = await getSubscriptionTiers(true);
                setTiers(data);
                // Auto-select "Free" if exists or first one
                if (data.length > 0) setSelectedTierId(data[0].id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadTiers();
    }, []);

    const handleSelect = (id: string) => {
        setSelectedTierId(id);
        toast.success('Subscription updated (Mock)');
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
                <h1 className="text-3xl font-bold mb-2">Platform Subscriptions</h1>
                <p className="text-muted">Choose the right plan for your organization's growth. Scale with confidence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {tiers.map(tier => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                        <Card
                            key={tier.id}
                            className={`relative border-2 transition-all ${isSelected ? 'border-primary-500 bg-primary-500/5 shadow-2xl shadow-primary-500/20' : 'border-transparent hover:border-glass-border'}`}
                        >
                            {isSelected && (
                                <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
                                    <div className="bg-primary-500 text-white p-2 rounded-full shadow-lg">
                                        <Check className="w-5 h-5" />
                                    </div>
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                <CardDescription>
                                    {tier.maxTeams ? `Up to ${tier.maxTeams} teams` : 'Unlimited teams'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-end gap-1">
                                    <span className="text-4xl font-bold">${tier.monthlyPrice}</span>
                                    <span className="text-muted mb-1">/month</span>
                                </div>

                                <ul className="space-y-3">
                                    {/* Mock features based on json/string for now */}
                                    <li className="flex items-center gap-2">
                                        <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500" /></div>
                                        <span className="text-sm">Advanced Stats</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500" /></div>
                                        <span className="text-sm">Real-time Updates</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500" /></div>
                                        <span className="text-sm">Priority Support</span>
                                    </li>
                                </ul>

                                <Button
                                    className="w-full"
                                    variant={isSelected ? 'secondary' : 'primary'}
                                    onClick={() => handleSelect(tier.id)}
                                >
                                    {isSelected ? 'Current Plan' : 'Select Plan'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
