import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatGender } from '@/utils/formatters';
import * as z from 'zod';
import { Button } from '@/components/Button';
import { SearchableSelect } from '@/components/SearchableSelect';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { ImageUpload } from '@/components/common/ImageUpload';
import { ArrowLeft, Trash, Plus, PencilSimple, Check, X, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { updateTournament, getTournament, getTournamentVenues, createTournamentVenue, updateTournamentVenue, deleteTournamentVenue } from '@/api/tournaments.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { getActiveSeasons } from '@/api/seasons.api';
import { Organisation, CreateCategoryRequest, TournamentVenue } from '@/types';
import { LivestreamLinksEditor } from '@/components/common/LivestreamLinksEditor';
import { livestreamLinksSchema } from '@/utils/validators';
import { showToast } from '@/lib/customToast';

const categorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    gender: z.string().optional(),
    minYear: z.number().nullable().optional(),
    maxYear: z.number().nullable().optional()
});

const tournamentSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    organiserOrgId: z.string().min(1, "Organisation is required"),
    // Season can be ID (UUID) or Name (String) - we allow both via separate logic but schema handles "what we send"
    // Actually we'll manage this manually in onSubmit, so let's make it optional here or string
    seasonInput: z.string().min(1, "Season is required"),
    competitionType: z.string(),
    level: z.string(),
    venue: z.string().min(1, "Venue is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    categories: z.array(categorySchema).optional(),
    logoUrl: z.string().nullable().optional().or(z.literal('')),
    bannerUrl: z.string().nullable().optional().or(z.literal('')),
    backgroundUrl: z.string().nullable().optional().or(z.literal('')),
    livestreamLinks: livestreamLinksSchema
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export const EditTournament = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    // State for the new category input
    const [newCategory, setNewCategory] = useState<CreateCategoryRequest>({
        name: '',
        gender: 'MALE',
        minYear: undefined,
        maxYear: undefined
    });

    // State for venue management
    const [venues, setVenues] = useState<TournamentVenue[]>([]);
    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueShortName, setNewVenueShortName] = useState('');
    const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
    const [editingVenueName, setEditingVenueName] = useState('');
    const [editingVenueShortName, setEditingVenueShortName] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
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
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setFetching(true);
        try {
            const [orgsRes, tournamentRes, seasonsRes, venuesRes] = await Promise.all([
                fetchOrganisations(),
                getTournament(id),
                getActiveSeasons(),
                getTournamentVenues(id)
            ]);
            setOrganisations(orgsRes as any);
            setSeasons(seasonsRes);
            setVenues(venuesRes.data || []);

            const tournament = tournamentRes.data;

            // Set initial season value (Prefer ID if known/linked, else Name)
            // The tournament response has 'seasonName', but we ideally want seasonId if it exists.
            // backend 'getTournamentById' returns seasonName. Does it return seasonId?
            // Checking TournamentResponse: it has seasonName. It might fallback to name matching.
            // But if we want to bind to ID, we need to know which ID corresponds to that name in 'seasons' list.

            let initialSeasonValue = tournament.seasonName;
            if (tournament.seasonName) {
                const matchedSeason = seasonsRes.find(s => s.name === tournament.seasonName);
                if (matchedSeason) initialSeasonValue = matchedSeason.id;
            }

            reset({
                name: tournament.name,
                organiserOrgId: tournament.organiserOrgId || (tournament.organiserBranding?.id),
                seasonInput: initialSeasonValue,
                competitionType: tournament.competitionType,
                level: tournament.level,
                venue: tournament.venue,
                startDate: tournament.startDate?.split('T')[0],
                endDate: tournament.endDate?.split('T')[0],
                categories: tournament.categories?.map((c: any) => ({
                    name: c.name,
                    gender: c.gender,
                    minYear: c.minYear,
                    maxYear: c.maxYear
                })) || [],
                logoUrl: tournament.logoUrl,
                bannerUrl: tournament.bannerUrl,
                backgroundUrl: tournament.backgroundUrl,
                livestreamLinks: tournament.livestreamLinks
                    ?? (tournament.livestreamUrl ? [{ label: '', url: tournament.livestreamUrl }] : [])
            });

        } catch (error) {
            console.error('Failed to load data:', error);
            showToast.error("Failed to load tournament data");
            navigate('/dashboard/tournaments');
        } finally {
            setFetching(false);
        }
    };

    const handleAddVenue = async () => {
        if (!id || !newVenueName.trim()) return;
        try {
            const res = await createTournamentVenue(id, {
                name: newVenueName.trim(),
                shortName: newVenueShortName.trim() || undefined,
                displayOrder: venues.length
            });
            setVenues(prev => [...prev, res.data]);
            setNewVenueName('');
            setNewVenueShortName('');
            showToast.success(`Added venue "${res.data.name}"`);
        } catch (err: unknown) {
            console.error('Failed to add venue:', err);
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showToast.error(message || 'Failed to add venue');
        }
    };

    const handleStartEditVenue = (v: TournamentVenue) => {
        setEditingVenueId(v.id);
        setEditingVenueName(v.name);
        setEditingVenueShortName(v.shortName || '');
    };

    const handleSaveEditVenue = async (venueId: string) => {
        if (!id || !editingVenueName.trim()) return;
        try {
            const res = await updateTournamentVenue(id, venueId, {
                name: editingVenueName.trim(),
                shortName: editingVenueShortName.trim() || undefined
            });
            setVenues(prev => prev.map(v => v.id === venueId ? res.data : v));
            setEditingVenueId(null);
            showToast.success(`Updated venue "${res.data.name}"`);
        } catch (err: unknown) {
            console.error('Failed to update venue:', err);
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showToast.error(message || 'Failed to update venue');
        }
    };

    const handleDeleteVenue = async (venue: TournamentVenue) => {
        if (!id) return;
        if (venues.length <= 1) {
            showToast.error("At least one venue is required for the tournament.");
            return;
        }
        try {
            await deleteTournamentVenue(id, venue.id);
            setVenues(prev => prev.filter(v => v.id !== venue.id));
            showToast.success(`Deleted venue "${venue.name}"`);
        } catch (err: unknown) {
            console.error('Failed to delete venue:', err);
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showToast.error(message || `Cannot delete venue "${venue.name}": matches may be assigned to it.`);
        }
    };

    const handleMoveVenue = async (index: number, direction: 'up' | 'down') => {
        if (!id) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= venues.length) return;

        const updated = [...venues];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setVenues(updated);

        try {
            await Promise.all([
                updateTournamentVenue(id, updated[index].id, { displayOrder: index }),
                updateTournamentVenue(id, updated[targetIndex].id, { displayOrder: targetIndex })
            ]);
        } catch (error) {
            console.error('Failed to persist venue reorder:', error);
        }
    };

    const addCategory = () => {
        if (!newCategory.name) return;

        const currentCategories = watch('categories') || [];
        setValue('categories', [...currentCategories, { ...newCategory }]);

        setNewCategory({ name: '', gender: 'MALE', minYear: undefined, maxYear: undefined });
    };

    const removeCategory = (index: number) => {
        const currentCategories = watch('categories') || [];
        setValue('categories', currentCategories.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: TournamentFormData) => {
        if (!id) return;
        setLoading(true);
        try {
            // Determine if seasonInput is ID or Name
            const isUuid = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(data.seasonInput);

            // Build payload with only fields the backend TournamentUpdateRequest DTO accepts.
            // Exclude categories (managed via dedicated category endpoints) to avoid
            // destructive clear+recreate that triggers FK constraint violations (409).
            // Exclude seasonInput and competitionType which aren't in the DTO.
            const payload = {
                name: data.name,
                organiserOrgId: data.organiserOrgId,
                level: data.level,
                venue: data.venue,
                startDate: data.startDate,
                endDate: data.endDate,
                logoUrl: data.logoUrl,
                bannerUrl: data.bannerUrl,
                backgroundUrl: data.backgroundUrl,
                // The whole list is sent, so removing every row clears the links.
                livestreamLinks: (data.livestreamLinks ?? []).filter(link => link.url.trim()),
                seasonId: isUuid ? data.seasonInput : undefined,
                seasonName: !isUuid ? data.seasonInput : undefined,
            };

            await updateTournament(id, payload);
            showToast.success("Tournament updated successfully");
            navigate('/dashboard/tournaments');
        } catch (error: any) {
            console.error('Failed to update tournament', error);
            showToast.error(error?.response?.data?.message || 'Failed to update tournament');
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
                <form onSubmit={handleSubmit(onSubmit, (errors) => {
                    console.error("Form validation errors:", errors);
                    showToast.error("Please check the form for errors");
                })} className="space-y-8">

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
                                <Controller
                                    name="seasonInput"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Season"
                                            placeholder="Select or Create Season"
                                            value={field.value}
                                            onChange={(val) => {
                                                setValue('seasonInput', val as string);
                                            }}
                                            options={seasons.map(s => ({ value: s.id, label: s.name }))}
                                            creatable
                                            error={errors.seasonInput?.message}
                                            required
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tournament Logo</label>
                                <div className="w-32">
                                    <ImageUpload
                                        value={watch('logoUrl') || undefined}
                                        onChange={(url) => setValue('logoUrl', url)}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Banner Image (Wide)</label>
                                <ImageUpload
                                    value={watch('bannerUrl') || undefined}
                                    onChange={(url) => setValue('bannerUrl', url)}
                                    aspectRatio="banner"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Background Image</label>
                                <ImageUpload
                                    value={watch('backgroundUrl') || undefined}
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
                                            {(() => {
                                                const sd = watch('startDate');
                                                const refYear = sd ? new Date(sd).getFullYear() : new Date().getFullYear();
                                                const minAgeVal = cat.maxYear ? refYear - cat.maxYear : null;
                                                const maxAgeVal = cat.minYear ? refYear - cat.minYear : null;

                                                let ageText = '';
                                                if (minAgeVal !== null && maxAgeVal !== null) {
                                                    ageText = `(Age ${minAgeVal}-${maxAgeVal})`;
                                                } else if (minAgeVal !== null) {
                                                    ageText = `(Age ${minAgeVal}+)`;
                                                } else if (maxAgeVal !== null) {
                                                    ageText = `(Age U${maxAgeVal})`;
                                                }

                                                return (
                                                    <span>
                                                        {formatGender(cat.gender)} • {cat.minYear ? `Born after ${cat.minYear}` : ''} {cat.maxYear ? `Before ${cat.maxYear}` : ''} {ageText}
                                                    </span>
                                                );
                                            })()}
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
                                    label="Gender"
                                    value={newCategory.gender}
                                    onChange={(value) => setNewCategory(prev => ({ ...prev, gender: value as string }))}
                                    options={[
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                        { value: 'MIXED', label: 'Mixed' }
                                    ]}
                                    className="h-full"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-muted-foreground block">Min Year</label>
                                    {newCategory.minYear && (
                                        <span className="text-[10px] text-primary-400">
                                            {(() => {
                                                const sd = watch('startDate');
                                                const refYear = sd ? new Date(sd).getFullYear() : new Date().getFullYear();
                                                return `Age ${refYear - newCategory.minYear}`;
                                            })()}
                                        </span>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={newCategory.minYear || ''}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, minYear: e.target.value ? parseInt(e.target.value) : undefined }))}
                                    placeholder="e.g. 2008"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-muted-foreground block">Max Year</label>
                                    {newCategory.maxYear && (
                                        <span className="text-[10px] text-primary-400">
                                            {(() => {
                                                const sd = watch('startDate');
                                                const refYear = sd ? new Date(sd).getFullYear() : new Date().getFullYear();
                                                return `Age ${refYear - newCategory.maxYear}`;
                                            })()}
                                        </span>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={newCategory.maxYear || ''}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, maxYear: e.target.value ? parseInt(e.target.value) : undefined }))}
                                    placeholder="e.g. 2006"
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
                                    label="Headline Location / Host City"
                                    placeholder="e.g. Petaling Jaya, Malaysia"
                                    {...register('venue')}
                                    error={errors.venue?.message}
                                    required
                                />
                            </div>

                            {/* Tournament Venues Registry */}
                            <div className="col-span-1 md:col-span-2 space-y-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-white/10">
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground">Tournament Match Venues</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Registered venues for this tournament. Sequential match numbers (1, 2, 3...) are tracked per venue.
                                    </p>
                                </div>

                                {/* Existing venues */}
                                <div className="space-y-2">
                                    {venues.map((v, idx) => (
                                        <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 gap-3">
                                            {editingVenueId === v.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <Input
                                                        value={editingVenueName}
                                                        onChange={(e) => setEditingVenueName(e.target.value)}
                                                        placeholder="Venue Name"
                                                        className="h-8 text-sm flex-1"
                                                    />
                                                    <Input
                                                        value={editingVenueShortName}
                                                        onChange={(e) => setEditingVenueShortName(e.target.value)}
                                                        placeholder="Abbr (opt)"
                                                        className="h-8 text-sm w-28"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveEditVenue(v.id)}
                                                        className="text-emerald-500 hover:text-emerald-400 p-1.5 rounded hover:bg-white/5"
                                                        title="Save"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingVenueId(null)}
                                                        className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-white/5"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col">
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => handleMoveVenue(idx, 'up')}
                                                                className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === venues.length - 1}
                                                                onClick={() => handleMoveVenue(idx, 'down')}
                                                                className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown size={12} />
                                                            </button>
                                                        </div>
                                                        <span className="font-medium text-foreground text-sm">{v.name}</span>
                                                        {v.shortName && (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground">
                                                                {v.shortName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditVenue(v)}
                                                            className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-white/5"
                                                            title="Edit venue"
                                                        >
                                                            <PencilSimple size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteVenue(v)}
                                                            className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-white/5"
                                                            title="Delete venue"
                                                        >
                                                            <Trash size={15} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Add Venue Input */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <Input
                                        value={newVenueName}
                                        onChange={(e) => setNewVenueName(e.target.value)}
                                        placeholder="New Venue Name (e.g. Field 2 / Stadium B)"
                                        className="h-9 text-sm flex-1"
                                    />
                                    <Input
                                        value={newVenueShortName}
                                        onChange={(e) => setNewVenueShortName(e.target.value)}
                                        placeholder="Short code (optional)"
                                        className="h-9 text-sm w-36"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddVenue}
                                        className="h-9 flex items-center gap-1 text-xs"
                                        disabled={!newVenueName.trim()}
                                    >
                                        <Plus size={14} /> Add
                                    </Button>
                                </div>
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
                                <Controller
                                    name="livestreamLinks"
                                    control={control}
                                    render={({ field }) => (
                                        <LivestreamLinksEditor
                                            value={field.value ?? []}
                                            onChange={field.onChange}
                                            error={errors.livestreamLinks?.message ?? errors.livestreamLinks?.root?.message}
                                        />
                                    )}
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
