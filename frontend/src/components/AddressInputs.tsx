import React, { useState, useEffect, useMemo } from 'react';
import { Input } from './Input';
import { MALAYSIA_STATES, getDistrictsForState, getSarawakDistricts, detectStateFromPostcode, SARAWAK_GEO_DATA } from '@/constants/malaysia-geo';

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
    // Dynamic import of country-state-city database
    const [csc, setCsc] = useState<any>(null);
    useEffect(() => {
        import('country-state-city').then(module => {
            setCsc(module);
        });
    }, []);

    // Global location states
    const countries = useMemo<any[]>(() => {
        return csc ? csc.Country.getAllCountries() : [];
    }, [csc]);

    const [globalStates, setGlobalStates] = useState<any[]>([]);
    const [globalCities, setGlobalCities] = useState<any[]>([]);

    // Malaysia specific states
    const [myDistricts, setMyDistricts] = useState<string[]>([]);
    const [sarawakDivision, setSarawakDivision] = useState<string>('');

    // Auto-detect Sarawak Division from City if it's Sarawak and not set
    useEffect(() => {
        const isSarawak = data.countryCode === 'MY' && (data.stateCode === 'MY-13' || data.state === 'Sarawak');
        if (isSarawak && data.city && !sarawakDivision) {
            const foundDivision = Object.keys(SARAWAK_GEO_DATA).find(div => 
                SARAWAK_GEO_DATA[div].includes(data.city!)
            );
            if (foundDivision) {
                setSarawakDivision(foundDivision);
                const districts = getSarawakDistricts(foundDivision);
                setMyDistricts(districts);
            }
        }
    }, [data.countryCode, data.stateCode, data.state, data.city, sarawakDivision]);

    // Effect to handle dynamic loading of states/cities when country/state changes
    useEffect(() => {
        if (csc) {
            setGlobalStates(csc.State.getStatesOfCountry(data.countryCode || 'MY'));
        }
    }, [csc, data.countryCode]);

    useEffect(() => {
        if (csc && data.countryCode && data.stateCode && data.countryCode !== 'MY') {
            setGlobalCities(csc.City.getCitiesOfState(data.countryCode, data.stateCode));
        } else {
            setGlobalCities([]);
        }
    }, [csc, data.countryCode, data.stateCode]);

    // Initialize MY districts/divisions based on current state
    useEffect(() => {
        if (data.countryCode === 'MY') {
            if (data.stateCode) {
                const districts = getDistrictsForState(data.stateCode);
                setMyDistricts(districts);
            } else if (data.state) {
                const stateObj = MALAYSIA_STATES.find(s => s.name === data.state);
                if (stateObj) {
                    setMyDistricts(stateObj.districts);
                }
            }
        }
    }, [data.stateCode, data.state, data.countryCode]);

    const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPostcode = e.target.value;
        const updates: AddressData = { ...data, postcode: newPostcode };

        // Auto-detect State via Postcode (Malaysia only for now)
        if (newPostcode.length === 5 && (!data.countryCode || data.countryCode === 'MY')) {
            const detected = detectStateFromPostcode(newPostcode);
            if (detected) {
                updates.stateCode = detected.code;
                updates.state = detected.name;
                updates.country = 'Malaysia';
                updates.countryCode = 'MY';

                const districts = getDistrictsForState(detected.code);
                setMyDistricts(districts);
                setSarawakDivision(''); 
            }
        }
        onChange(updates);
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cCode = e.target.value;
        const selectedCountry = countries.find(c => c.isoCode === cCode);

        onChange({
            ...data,
            countryCode: cCode,
            country: selectedCountry?.name || '',
            stateCode: '',
            state: '',
            city: '' 
        });
        
        setSarawakDivision('');
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sCode = e.target.value;
        
        let stateName = '';
        if (data.countryCode === 'MY') {
            const selectedState = MALAYSIA_STATES.find(s => s.code === sCode);
            stateName = selectedState ? selectedState.name : '';
            const districts = getDistrictsForState(sCode);
            setMyDistricts(districts);
            setSarawakDivision('');
        } else {
            const selectedState = globalStates.find(s => s.isoCode === sCode);
            stateName = selectedState ? selectedState.name : '';
        }

        onChange({
            ...data,
            stateCode: sCode,
            state: stateName,
            city: ''
        });
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        onChange({ ...data, city: e.target.value });
    };

    const renderCityOrDistrictSelect = () => {
        if (data.countryCode === 'MY') {
            const isSarawak = data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak');
            return (
                <>
                    {/* Robust check for Sarawak */}
                    {isSarawak && (
                        <div className="mb-2">
                            <select
                                value={sarawakDivision}
                                onChange={(e) => {
                                    const div = e.target.value;
                                    setSarawakDivision(div);
                                    const districts = getSarawakDistricts(div);
                                    setMyDistricts(districts);
                                    onChange({ ...data, city: '' });
                                }}
                                disabled={disabled}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs mb-1"
                                aria-label="Division"
                            >
                                <option value="">Select Division (Sarawak)</option>
                                {getDistrictsForState('MY-13').map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(myDistricts.length > 0) ? (
                        <select
                            value={data.city || ''}
                            onChange={handleCityChange}
                            disabled={disabled || (isSarawak && !sarawakDivision)}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-label="City"
                        >
                            <option value="">Select...</option>
                            {(isSarawak && sarawakDivision
                                ? getSarawakDistricts(sarawakDivision)
                                : (isSarawak ? [] : myDistricts)
                            ).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            value={data.city || ''}
                            onChange={handleCityChange}
                            placeholder="City Name"
                            disabled={disabled}
                        />
                    )}
                </>
            );
        } else {
            // Global Cities
            if (globalCities.length > 0) {
                return (
                    <select
                        value={data.city || ''}
                        onChange={handleCityChange}
                        disabled={disabled}
                        className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="City"
                    >
                        <option value="">Select city</option>
                        {globalCities.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                );
            } else {
                return (
                    <Input
                        value={data.city || ''}
                        onChange={handleCityChange}
                        placeholder="City Name"
                        disabled={disabled}
                    />
                );
            }
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">Country</label>}
                <select
                    value={data.countryCode || 'MY'}
                    onChange={handleCountryChange}
                    disabled={disabled}
                    className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Country"
                >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                    ))}
                </select>
            </div>

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
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">State / Province</label>}
                {data.countryCode === 'MY' ? (
                    <select
                        value={data.stateCode || ''}
                        onChange={handleStateChange}
                        disabled={disabled}
                        className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="State"
                    >
                        <option value="">Select State</option>
                        {MALAYSIA_STATES.map(s => (
                            <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                ) : (
                    globalStates.length > 0 ? (
                        <select
                            value={data.stateCode || ''}
                            onChange={handleStateChange}
                            disabled={disabled}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-label="State"
                        >
                            <option value="">Select State</option>
                            {globalStates.map(s => (
                                <option key={s.isoCode} value={s.isoCode}>{s.name} ({s.isoCode})</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            value={data.state || ''}
                            onChange={(e) => onChange({ ...data, state: e.target.value, stateCode: '' })}
                            placeholder="State/Province Name"
                            disabled={disabled}
                        />
                    )
                )}
            </div>

            <div className="col-span-2">
                {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">City / District</label>}
                {renderCityOrDistrictSelect()}
            </div>
        </div>
    );
};
