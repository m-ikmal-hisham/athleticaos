import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { ImageUpload } from '@/components/common/ImageUpload';
import { ArrowLeft, Trash, Plus } from '@phosphor-icons/react';
import { updateTournament, getTournament } from '@/api/tournaments.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { Organisation, CreateCategoryRequest } from '@/types';
import toast from 'react-hot-toast';

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
    categories: z.array(categorySchema).optional(),
    logoUrl: z.string().optional(),
    livestreamUrl: z.string().optional()
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export const EditTournament = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    // State for the new category input
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
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setFetching(true);
        try {
            const [orgsRes, tournamentRes] = await Promise.all([
                fetchOrganisations(),
                getTournament(id)
            ]);
            setOrganisations(orgsRes as any);

            const tournament = tournamentRes.data;
            reset({
                name: tournament.name,
                organiserOrgId: tournament.organiserOrgId || (tournament.organiserBranding?.id),
                seasonName: tournament.seasonName,
                competitionType: tournament.competitionType,
                level: tournament.level,
                venue: tournament.venue,
                startDate: tournament.startDate?.split('T')[0],
                endDate: tournament.endDate?.split('T')[0],
                categories: tournament.categories?.map((c: any) => ({
                    name: c.name,
                    gender: c.gender,
                    minAge: c.minAge,
                    maxAge: c.maxAge
                })) || [],
                logoUrl: tournament.logoUrl,
                livestreamUrl: tournament.livestreamUrl
            });

        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error("Failed to load tournament data");
            navigate('/dashboard/tournaments');
        } finally {
            setFetching(false);
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

    const onSubmit = async (data: TournamentFormData) => {
        if (!id) return;
        setLoading(true);
        try {
            await updateTournament(id, data);
            toast.success("Tournament updated successfully");
            navigate('/dashboard/tournaments');
        } catch (error: any) {
            console.error('Failed to update tournament', error);
            toast.error(error?.response?.data?.message || 'Failed to update tournament');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tournaments')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Tournament"
                    description="Update tournament details"
                />
            </div>

            <GlassCard className="max-w-4xl mx-auto p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <Input
                                    label="Tournament Name"
                                    placeholder="e.g. Super League 2024"
                                    {...register('name')}
                                    error={errors.name?.message}
                                    required
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Organiser <span className="text-red-400 ml-1">*</span>
                                </label>
                                <select
                                    {...register('organiserOrgId')}
                                    className="input-base w-full"
                                >
                                    <option value="">Select Organisation</option>
                                    {organisations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                {errors.organiserOrgId && <p className="mt-1.5 text-xs text-red-500">{errors.organiserOrgId.message}</p>}
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tournament Logo</label>
                                <ImageUpload
                                    value={watch('logoUrl')}
                                    onChange={(url) => setValue('logoUrl', url)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Competition Format */}
                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">Competition Format</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    className="input-base w-full"
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
                                    className="input-base w-full"
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

                    {/* Categories */}
                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">Categories</h3>

                        <div className="space-y-3 mb-4">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10">
                                    <div>
                                        <span className="font-medium text-foreground">{cat.name}</span>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {cat.gender} • {cat.minAge && cat.maxAge ? `${cat.minAge}-${cat.maxAge} years` : 'Open Age'}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeCategory(idx)} className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-white/5" aria-label="Remove category">
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-12 gap-3 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="col-span-12 md:col-span-4">
                                <label className="text-xs text-muted-foreground mb-1 block">Category Name</label>
                                <Input
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. U16 Boys"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                                <select
                                    value={newCategory.gender}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, gender: e.target.value }))}
                                    className="input-base w-full h-9 text-sm"
                                    title="Gender"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="MIXED">Mixed</option>
                                </select>
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <label className="text-xs text-muted-foreground mb-1 block">Min Age</label>
                                <Input
                                    type="number"
                                    value={newCategory.minAge || ''}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, minAge: e.target.value ? parseInt(e.target.value) : undefined }))}
                                    placeholder="Min"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <label className="text-xs text-muted-foreground mb-1 block">Max Age</label>
                                <Input
                                    type="number"
                                    value={newCategory.maxAge || ''}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, maxAge: e.target.value ? parseInt(e.target.value) : undefined }))}
                                    placeholder="Max"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <Button type="button" variant="primary" onClick={addCategory} className="w-full h-9 p-0 flex items-center justify-center">
                                    <Plus size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Logistics */}
                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">Logistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
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
                            <div className="col-span-1 md:col-span-2">
                                <Input
                                    label="Livestream URL"
                                    placeholder="https://youtube.com/..."
                                    {...register('livestreamUrl')}
                                    error={errors.livestreamUrl?.message}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/tournaments')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={loading}>
                            Update Tournament
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
