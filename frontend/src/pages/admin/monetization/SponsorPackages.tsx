import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/Card';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell
} from '@/components/Table';
import { Button } from '@/components/Button';
import { Plus, Trash } from '@phosphor-icons/react';
import {
    getSponsorPackages,
    createSponsorPackage,
    deleteSponsorPackage,
    SponsorPackage
} from '@/api/monetization.api';
import { toast } from 'react-hot-toast';

export const SponsorPackages = () => {
    const [packages, setPackages] = useState<SponsorPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Simple form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        features: '',
        active: true
    });

    const loadPackages = async () => {
        try {
            const data = await getSponsorPackages(false); // Get all
            setPackages(data);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load packages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSponsorPackage({
                ...formData,
                price: parseFloat(formData.price),
                active: true
            });
            toast.success('Package created');
            setIsCreating(false);
            setFormData({
                name: '',
                description: '',
                price: '',
                currency: 'USD',
                features: '',
                active: true
            });
            loadPackages();
        } catch (e) {
            console.error(e);
            toast.error('Failed to create package');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try {
            await deleteSponsorPackage(id);
            toast.success('Package deleted');
            loadPackages();
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete package');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Sponsor Packages</h1>
                    <p className="text-muted text-sm">Manage sponsorship tiers available for tournaments.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus className="w-5 h-5 mr-2" />
                    New Package
                </Button>
            </div>

            {isCreating && (
                <Card className="mb-6 border-primary-500/20 bg-primary-500/5">
                    <CardHeader>
                        <CardTitle>Create New Package</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        aria-label="Package Name"
                                        className="w-full h-10 px-3 rounded-md bg-glass-panel border border-glass-border"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Price</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        aria-label="Package Price"
                                        className="w-full h-10 px-3 rounded-md bg-glass-panel border border-glass-border"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full p-3 rounded-md bg-glass-panel border border-glass-border"
                                    value={formData.description}
                                    aria-label="Package Description"
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Features (Comma separated)</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-md bg-glass-panel border border-glass-border"
                                    value={formData.features}
                                    aria-label="Package Features"
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit">Create Package</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Features</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {packages.map(pkg => (
                            <TableRow key={pkg.id}>
                                <TableCell className="font-medium">{pkg.name}</TableCell>
                                <TableCell>{pkg.currency} {pkg.price}</TableCell>
                                <TableCell className="max-w-[300px] truncate">{pkg.features}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${pkg.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {pkg.active ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400" onClick={() => handleDelete(pkg.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
