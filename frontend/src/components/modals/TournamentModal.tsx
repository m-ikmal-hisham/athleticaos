import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { createTournament } from '@/api/tournaments.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { Organisation, CreateCategoryRequest } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

const categorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    gender: z.string().optional(),
    minAge: z.number().optional(),
    maxAge: z.number().optional()
});

const tournamentSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    organiserOrgId: z.string().min(1, "Organisation is required"),
    seasonName: z.string().min(1, "Season name is required"),
    competitionType: z.string(),
    level: z.string(),
    venue: z.string().min(1, "Venue is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    categories: z.array(categorySchema).optional()
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const TournamentModal = ({ isOpen, onClose, onSuccess }: TournamentModalProps) => {
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    // State for the new category input (not yet added to form)
    const [newCategory, setNewCategory] = useState<CreateCategoryRequest>({
        name: '',
        gender: 'MALE',
        minAge: undefined,
        maxAge: undefined
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<TournamentFormData>({
        resolver: zodResolver(tournamentSchema),
        defaultValues: {
            competitionType: 'LEAGUE',
            level: 'CLUB',
            categories: []
        }
    });

    const categories = watch('categories') || [];

    useEffect(() => {
        if (isOpen) {
            loadOrganisations();
            reset(); // Reset form when opening
        }
    }, [isOpen, reset]);

    const loadOrganisations = async () => {
        try {
            const data = await fetchOrganisations();
            setOrganisations(data as any);
        } catch (error) {
            console.error('Failed to load organisations:', error);
        }
    };

    const onSubmit = async (data: TournamentFormData) => {
        setLoading(true);
        try {
            // Transform data if necessary, here it matches the API mostly but we need to pass numeric constraints?
            // The API expects CreateCategoryRequest which matches our schema pretty well.
            await createTournament(data as any);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create tournament', error);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = () => {
        if (!newCategory.name) return;

        const currentCategories = watch('categories') || [];
        setValue('categories', [...currentCategories, { ...newCategory }]);

        setNewCategory({ name: '', gender: 'MALE', minAge: undefined, maxAge: undefined });
    };

    const removeCategory = (index: number) => {
        const currentCategories = watch('categories') || [];
        setValue('categories', currentCategories.filter((_, i) => i !== index));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Tournament"
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <Input
                            label="Tournament Name"
                            placeholder="e.g. Super League 2024"
                            {...register('name')}
                            error={errors.name?.message}
                            required
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Organiser <span className="text-red-400 ml-1">*</span>
                        </label>
                        <select
                            {...register('organiserOrgId')}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Select Organisation</option>
                            {organisations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                        {errors.organiserOrgId && <p className="mt-1.5 text-sm text-red-400">{errors.organiserOrgId.message}</p>}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Competition Format</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="Season"
                                placeholder="e.g. 2024/2025"
                                {...register('seasonName')}
                                error={errors.seasonName?.message}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                            <select
                                {...register('competitionType')}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="LEAGUE">League</option>
                                <option value="KNOCKOUT">Knockout</option>
                                <option value="GROUP_KNOCKOUT">Group + Knockout</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Level</label>
                            <select
                                {...register('level')}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="INTERNATIONAL">International</option>
                                <option value="NATIONAL">National</option>
                                <option value="STATE">State</option>
                                <option value="DIVISION">Division</option>
                                <option value="CLUB">Club</option>
                                <option value="SCHOOL">School</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Categories</h3>

                    <div className="space-y-3 mb-4">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10">
                                <div>
                                    <span className="font-medium text-foreground">{cat.name}</span>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {cat.gender} • {cat.minAge && cat.maxAge ? `${cat.minAge}-${cat.maxAge} years` : 'Open Age'}
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeCategory(idx)} className="text-red-500 hover:text-red-400" aria-label="Remove category">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="col-span-4">
                            <label className="text-xs text-muted-foreground mb-1 block">Category Name</label>
                            <Input
                                value={newCategory.name}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. U16 Boys"
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                            <select
                                value={newCategory.gender}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, gender: e.target.value }))}
                                className="w-full h-9 px-3 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                title="Gender"
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Min Age</label>
                            <Input
                                type="number"
                                value={newCategory.minAge || ''}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, minAge: e.target.value ? parseInt(e.target.value) : undefined }))}
                                placeholder="Min"
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Max Age</label>
                            <Input
                                type="number"
                                value={newCategory.maxAge || ''}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, maxAge: e.target.value ? parseInt(e.target.value) : undefined }))}
                                placeholder="Max"
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="col-span-1">
                            <Button type="button" variant="primary" onClick={addCategory} className="w-full h-9 p-0 flex items-center justify-center">
                                <Plus size={16} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Logistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Venue"
                                placeholder="Primary Venue"
                                {...register('venue')}
                                error={errors.venue?.message}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                label="Start Date"
                                {...register('startDate')}
                                error={errors.startDate?.message}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                label="End Date"
                                {...register('endDate')}
                                error={errors.endDate?.message}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" variant="cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        Create Tournament
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
