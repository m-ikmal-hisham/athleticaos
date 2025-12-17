import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { MALAYSIA_STATES, getDistrictsForState, getSarawakDistricts, detectStateFromPostcode } from '@/constants/malaysia-geo';

export interface AddressData {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    state?: string;
    country?: string;
    stateCode?: string;
    countryCode?: string;
    // For internal use or robust mapping
    [key: string]: any;
}

interface AddressInputsProps {
    data: AddressData;
    onChange: (data: AddressData) => void;
    errors?: Record<string, string>;
    disabled?: boolean;
    showLabels?: boolean;
}

export const AddressInputs = ({ data, onChange, errors = {}, disabled = false, showLabels = true }: AddressInputsProps) => {
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
    const [sarawakDivision, setSarawakDivision] = useState<string>('');

    // Initialize districts/divisions based on current state
    useEffect(() => {
        if (data.stateCode) {
            const districts = getDistrictsForState(data.stateCode);
            setAvailableDistricts(districts);

            // If Sarawak and city is set but no division tracked locally, we might need to try to infer or just let user pick
            // But since we don't store division in DB explicitly in most cases (only City/State), we can't easily restore it without a city->division map.
            // For now, we leave division empty if not tracked, user might need to re-select if they want to change city.
        } else if (data.state) {
            // Try to find stateCode from name if missing
            const stateObj = MALAYSIA_STATES.find(s => s.name === data.state);
            if (stateObj) {
                // We should probably update stateCode but trigger onChange might cause loop if not careful
                // Let's just load districts
                setAvailableDistricts(stateObj.districts);
            }
        }
    }, [data.stateCode, data.state]);

    const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPostcode = e.target.value;
        const updates: AddressData = { ...data, postcode: newPostcode };

        // Auto-detect State via Postcode (if state not already set or if we want to override? Let's override if empty or user just typing)
        // Usually good UX: if user enters 5 digits, we check.
        if (newPostcode.length === 5) {
            const detected = detectStateFromPostcode(newPostcode);
            if (detected) {
                // Determine if we should overwrite. Maybe visually highlight?
                // For now, auto-set state code and name
                updates.stateCode = detected.code;
                updates.state = detected.name;
                updates.country = 'Malaysia';
                updates.countryCode = 'MY';

                // Refresh districts
                const districts = getDistrictsForState(detected.code);
                setAvailableDistricts(districts);
                setSarawakDivision(''); // Reset division on state change
            }
        }
        onChange(updates);
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const selectedState = MALAYSIA_STATES.find(s => s.code === code);

        const districts = getDistrictsForState(code);
        setAvailableDistricts(districts);
        setSarawakDivision('');

        onChange({
            ...data,
            stateCode: code,
            state: selectedState ? selectedState.name : '',
            city: '', // Reset city on state change
            country: 'Malaysia',
            countryCode: 'MY'
        });
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        onChange({ ...data, city: e.target.value });
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">Address Line 1</label>}
                <Input
                    value={data.addressLine1 || ''}
                    onChange={(e) => onChange({ ...data, addressLine1: e.target.value })}
                    placeholder="Unit No, Building Name"
                    disabled={disabled}
                    className={errors.addressLine1 ? 'border-red-500' : ''}
                />
            </div>
            <div className="col-span-2">
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">Address Line 2</label>}
                <Input
                    value={data.addressLine2 || ''}
                    onChange={(e) => onChange({ ...data, addressLine2: e.target.value })}
                    placeholder="Street Name, Taman, etc."
                    disabled={disabled}
                />
            </div>

            <div>
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">Postcode</label>}
                <Input
                    value={data.postcode || ''}
                    onChange={handlePostcodeChange}
                    placeholder="e.g. 96400"
                    disabled={disabled}
                />
            </div>

            <div>
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">State / Federal Territory</label>}
                <select
                    value={data.stateCode || (MALAYSIA_STATES.find(s => s.name === data.state)?.code || '')}
                    onChange={handleStateChange}
                    disabled={disabled}
                    className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="">Select State</option>
                    {MALAYSIA_STATES.map(s => (
                        <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                </select>
            </div>

            <div>
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">City / District</label>}

                {/* Robust check for Sarawak using prop or derived state */}
                {(data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak')) && (
                    <div className="mb-2">
                        <select
                            value={sarawakDivision}
                            onChange={(e) => {
                                const div = e.target.value;
                                setSarawakDivision(div);
                                const districts = getSarawakDistricts(div);
                                setAvailableDistricts(districts);
                                onChange({ ...data, city: '' });
                            }}
                            disabled={disabled}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs mb-1"
                        >
                            <option value="">Select Division (Sarawak)</option>
                            {/* Division list for Sarawak */}
                            {getDistrictsForState('MY-13').map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                )}

                {(availableDistricts.length > 0) ? (
                    <select
                        value={data.city || ''}
                        onChange={handleCityChange}
                        disabled={disabled || ((data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak')) && !sarawakDivision)}
                        className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">Select...</option>
                        {((data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak')) && sarawakDivision
                            ? getSarawakDistricts(sarawakDivision)
                            : ((data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak')) ? [] : availableDistricts)
                        ).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))
                        }
                    </select>
                ) : (
                    <Input
                        value={data.city || ''}
                        onChange={handleCityChange}
                        placeholder="City Name"
                        disabled={disabled}
                    />
                )}
            </div>

            <div>
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">Country</label>}
                <select
                    value={data.countryCode || (data.country === 'Malaysia' ? 'MY' : '')}
                    onChange={(e) => onChange({
                        ...data,
                        countryCode: e.target.value,
                        country: e.target.value === 'MY' ? 'Malaysia' : ''
                    })}
                    disabled={disabled}
                    className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="MY">Malaysia</option>
                    {/* Extendable */}
                </select>
            </div>
        </div>
    );
};
