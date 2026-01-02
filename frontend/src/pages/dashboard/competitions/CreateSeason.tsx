
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
import { ArrowLeft } from '@phosphor-icons/react';
import { createSeason } from '@/api/seasons.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { Organisation } from '@/types';
import { SeasonLevel, SeasonStatus, SeasonCreateRequest } from '@/types/season.types';
import toast from 'react-hot-toast';
import { slugify } from '@/utils/stringUtils';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const seasonSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    code: z.string().min(2, "Code must be at least 2 characters"),
    level: z.nativeEnum(SeasonLevel),
    status: z.nativeEnum(SeasonStatus).default(SeasonStatus.PLANNED),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    organiserId: z.string().min(1, "Organisation is required")
});

type SeasonFormData = z.infer<typeof seasonSchema>;

export const CreateSeason = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors }
    } = useForm<SeasonFormData>({
        resolver: zodResolver(seasonSchema),
        defaultValues: {
            level: SeasonLevel.NATIONAL,
            status: SeasonStatus.PLANNED,
            code: ''
        }
    });

    const seasonName = watch('name');

    useEffect(() => {
        const loadOrgs = async () => {
            try {
                const orgs = await fetchOrganisations();
                setOrganisations(orgs as any);
            } catch (error) {
                console.error("Failed to load organisations", error);
                toast.error("Failed to load organisations");
            }
        };
        loadOrgs();
    }, []);

    // Auto-generate code from name
    useEffect(() => {
        if (seasonName && !watch('code')) {
            setValue('code', slugify(seasonName).toUpperCase());
        }
    }, [seasonName, setValue, watch]);

    const onSubmit = async (data: SeasonFormData) => {
        setLoading(true);
        try {
            const payload: SeasonCreateRequest = {
                name: data.name,
                code: data.code,
                level: data.level,
                status: data.status,
                startDate: data.startDate,
                endDate: data.endDate,
                description: data.description,
                organiser: {
                    id: data.organiserId
                }
            };

            await createSeason(payload);
            toast.success("Season created successfully");
            navigate('/dashboard/competitions');
        } catch (error: any) {
            console.error('Failed to create season', error);
            toast.error(error?.response?.data?.message || 'Failed to create season');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Breadcrumbs
                items={[
                    { label: 'Competitions', path: '/dashboard/competitions' },
                    { label: 'Create Season' }
                ]}
            />
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/competitions')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Create Season"
                    description="Set up a new competition season"
                />
            </div>

            <GlassCard className="max-w-3xl mx-auto p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <Input
                                label="Season Name"
                                placeholder="e.g. 2024 National League"
                                {...register('name')}
                                error={errors.name?.message}
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label="Season Code"
                                placeholder="e.g. 2024-NAT-LGE"
                                {...register('code')}
                                error={errors.code?.message}
                                required
                            />
                        </div>

                        <div>
                            <Controller
                                name="level"
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect
                                        label="Level"
                                        required
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={Object.values(SeasonLevel).map(level => ({ value: level, label: level }))}
                                        error={errors.level?.message}
                                    />
                                )}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <Controller
                                name="organiserId"
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
                                        error={errors.organiserId?.message}
                                    />
                                )}
                            />
                        </div>

                        <div>
                            <Input
                                type="date"
                                label="Start Date"
                                {...register('startDate')}
                                error={errors.startDate?.message}
                            />
                        </div>

                        <div>
                            <Input
                                type="date"
                                label="End Date"
                                {...register('endDate')}
                                error={errors.endDate?.message}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <Input
                                label="Description"
                                placeholder="Optional description..."
                                {...register('description')}
                                error={errors.description?.message}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/competitions')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={loading}>
                            Create Season
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
