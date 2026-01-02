
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/Button';
import { SearchableSelect } from '@/components/SearchableSelect';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { ArrowLeft } from '@phosphor-icons/react';
import { getSeasonById, updateSeason } from '@/api/seasons.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { Organisation } from '@/types';
import { SeasonLevel, SeasonStatus, SeasonUpdateRequest } from '@/types/season.types';
import toast from 'react-hot-toast';

const seasonSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    code: z.string().min(2, "Code must be at least 2 characters"),
    level: z.nativeEnum(SeasonLevel),
    status: z.nativeEnum(SeasonStatus),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    organiserId: z.string().min(1, "Organisation is required")
});

type SeasonFormData = z.infer<typeof seasonSchema>;

export const EditSeason = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors }
    } = useForm<SeasonFormData>({
        resolver: zodResolver(seasonSchema),
        defaultValues: {
            level: SeasonLevel.NATIONAL,
            status: SeasonStatus.PLANNED,
            code: ''
        }
    });

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const [orgs, season] = await Promise.all([
                    fetchOrganisations(),
                    getSeasonById(id)
                ]);
                setOrganisations(orgs as any);

                // Populate form
                reset({
                    name: season.name,
                    code: season.code,
                    level: season.level as SeasonLevel,
                    status: season.status as SeasonStatus,
                    startDate: season.startDate || '',
                    endDate: season.endDate || '',
                    description: season.description || '',
                    organiserId: season.organiser?.id
                });
            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Failed to load season details");
                navigate('/dashboard/competitions');
            }
        };
        loadData();
    }, [id, navigate, reset]);

    const onSubmit = async (data: SeasonFormData) => {
        if (!id) return;
        setLoading(true);
        try {
            const payload: SeasonUpdateRequest = {
                name: data.name,
                code: data.code,
                level: data.level,
                startDate: data.startDate,
                endDate: data.endDate,
                description: data.description,
                organiser: {
                    id: data.organiserId
                }
            };


            await updateSeason(id, payload);
            toast.success("Season updated successfully");
            navigate(`/dashboard/competitions/seasons/${id}`);
        } catch (error: any) {
            console.error('Failed to update season', error);
            toast.error(error?.response?.data?.message || 'Failed to update season');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/competitions/seasons/${id}`)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Season"
                    description="Update competition season details"
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
                        <Button type="button" variant="cancel" onClick={() => navigate(`/dashboard/competitions/seasons/${id}`)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={loading}>
                            Update Season
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
