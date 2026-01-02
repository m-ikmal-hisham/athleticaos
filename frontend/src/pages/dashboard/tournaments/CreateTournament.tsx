import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/Button';
import { SearchableSelect } from '@/components/SearchableSelect';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { ImageUpload } from '@/components/common/ImageUpload';
import { ArrowLeft, Trash, Plus } from '@phosphor-icons/react';
import { createTournament } from '@/api/tournaments.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { getActiveSeasons } from '@/api/seasons.api';
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
    seasonInput: z.string().min(1, "Season is required"),
    competitionType: z.string(),
    level: z.string(),
    venue: z.string().min(1, "Venue is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    categories: z.array(categorySchema).optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    backgroundUrl: z.string().optional(),
    livestreamUrl: z.string().optional()
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export const CreateTournament = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);

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
        control,
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
        const loadData = async () => {
            try {
                const [orgsRes, seasonsRes] = await Promise.all([
                    fetchOrganisations(),
                    getActiveSeasons()
                ]);
                setOrganisations(orgsRes as any);
                setSeasons(seasonsRes);
            } catch (error) {
                console.error("Failed to load initial data", error);
                toast.error("Failed to load required data");
            }
        };
        loadData();
    }, []);

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
        setLoading(true);
        try {
            const isUuid = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(data.seasonInput);

            const payload = {
                ...data,
                seasonId: isUuid ? data.seasonInput : undefined,
                seasonName: !isUuid ? data.seasonInput : undefined,
            };

            await createTournament(payload);
            toast.success("Tournament created successfully");
            navigate('/dashboard/tournaments');
        } catch (error: any) {
            console.error('Failed to create tournament', error);
            toast.error(error?.response?.data?.message || 'Failed to create tournament');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tournaments')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Create New Tournament"
                    description="Set up a new rugby competition"
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
                                <Controller
                                    name="organiserOrgId"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Organiser"
                                            required
                                            placeholder="Select Organisation"
                                            value={field.value}
                                            onChange={field.onChange}
                                            options={organisations.map(org => ({
                                                value: org.id,
                                                label: org.name
                                            }))}
                                            error={errors.organiserOrgId?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tournament Logo</label>
                                <ImageUpload
                                    value={watch('logoUrl')}
                                    onChange={(url) => setValue('logoUrl', url)}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Banner Image (Wide)</label>
                                <ImageUpload
                                    value={watch('bannerUrl')}
                                    onChange={(url) => setValue('bannerUrl', url)}
                                    aspectRatio="banner"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Background Image</label>
                                <ImageUpload
                                    value={watch('backgroundUrl')}
                                    onChange={(url) => setValue('backgroundUrl', url)}
                                    aspectRatio="video"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Competition Format */}
                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">Competition Format</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Controller
                                    name="seasonInput"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Season"
                                            placeholder="Select or Create Season"
                                            value={field.value}
                                            onChange={field.onChange}
                                            options={seasons.map(s => ({ value: s.id, label: s.name }))}
                                            creatable
                                            error={errors.seasonInput?.message}
                                            required
                                        />
                                    )}
                                />
                            </div>
                            <div>
                                <Controller
                                    name="competitionType"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Type"
                                            value={field.value}
                                            onChange={field.onChange}
                                            options={[
                                                { value: 'LEAGUE', label: 'League' },
                                                { value: 'KNOCKOUT', label: 'Knockout' },
                                                { value: 'GROUP_KNOCKOUT', label: 'Group + Knockout' }
                                            ]}
                                        />
                                    )}
                                />
                            </div>
                            <div>
                                <Controller
                                    name="level"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Level"
                                            value={field.value}
                                            onChange={field.onChange}
                                            options={[
                                                { value: 'INTERNATIONAL', label: 'International' },
                                                { value: 'NATIONAL', label: 'National' },
                                                { value: 'STATE', label: 'State' },
                                                { value: 'DIVISION', label: 'Division' },
                                                { value: 'CLUB', label: 'Club' },
                                                { value: 'SCHOOL', label: 'School' }
                                            ]}
                                        />
                                    )}
                                />
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
                                <SearchableSelect
                                    label="Gender" // Adding label here for consistency, though original had it outside.
                                    // Actually original had <label>Gender</label> outside. searchableselect has built-in label support.
                                    // But the layout here is a grid, and the label was separate.
                                    // I'll suppress the internal label or use it?
                                    // The design has <label> above. SearchableSelect does the same.
                                    // I will use SearchableSelect's label and remove the external one.
                                    value={newCategory.gender}
                                    onChange={(value) => setNewCategory(prev => ({ ...prev, gender: value as string }))}
                                    options={[
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                        { value: 'MIXED', label: 'Mixed' }
                                    ]}
                                    className="h-full" // Ensure it fits
                                />
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
                            Create Tournament
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
