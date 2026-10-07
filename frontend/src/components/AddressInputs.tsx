import React, { useState, useEffect, useMemo } from 'react';
import { Input } from './Input';
import { Select } from './Select';
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

    const handleCountryChange = (cCode: string) => {
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

    const handleStateChange = (sCode: string) => {
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

    const handleCityChange = (val: string) => {
        onChange({ ...data, city: val });
    };

    const renderCityOrDistrictSelect = () => {
        if (data.countryCode === 'MY') {
            const isSarawak = data.stateCode === 'MY-13' || (!data.stateCode && data.state === 'Sarawak');
            return (
                <>
                    {/* Robust check for Sarawak */}
                    {isSarawak && (
                        <div className="mb-2">
                            <Select
                                value={sarawakDivision}
                                onChange={(val) => {
                                    const div = String(val);
                                    setSarawakDivision(div);
                                    const districts = getSarawakDistricts(div);
                                    setMyDistricts(districts);
                                    onChange({ ...data, city: '' });
                                }}
                                disabled={disabled}
                                aria-label="Division"
                                placeholder="Select Division (Sarawak)"
                                options={[
                                    { value: '', label: 'Select Division (Sarawak)' },
                                    ...getDistrictsForState('MY-13').map(d => ({ value: d, label: d }))
                                ]}
                            />
                        </div>
                    )}

                    {(myDistricts.length > 0) ? (
                        <Select
                            value={data.city || ''}
                            onChange={(val) => handleCityChange(String(val))}
                            disabled={disabled || (isSarawak && !sarawakDivision)}
                            aria-label="City"
                            placeholder="Select..."
                            options={[
                                { value: '', label: 'Select...' },
                                ...(isSarawak && sarawakDivision
                                    ? getSarawakDistricts(sarawakDivision)
                                    : (isSarawak ? [] : myDistricts)
                                ).map(d => ({ value: d, label: d }))
                            ]}
                        />
                    ) : (
                        <Input
                            value={data.city || ''}
                            onChange={(e) => handleCityChange(e.target.value)}
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
                    <Select
                        value={data.city || ''}
                        onChange={(val) => handleCityChange(String(val))}
                        disabled={disabled}
                        aria-label="City"
                        placeholder="Select city"
                        options={[
                            { value: '', label: 'Select city' },
                            ...globalCities.map(c => ({ value: c.name, label: c.name }))
                        ]}
                    />
                );
            } else {
                return (
                    <Input
                        value={data.city || ''}
                        onChange={(e) => handleCityChange(e.target.value)}
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
                <Select
                    label={showLabels ? "Country" : undefined}
                    value={data.countryCode || 'MY'}
                    onChange={(val) => handleCountryChange(String(val))}
                    disabled={disabled}
                    aria-label="Country"
                    placeholder="Select Country"
                    options={[
                        { value: '', label: 'Select Country' },
                        ...countries.map(c => ({ value: c.isoCode, label: c.name }))
                    ]}
                />
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
                {data.countryCode === 'MY' ? (
                    <Select
                        label={showLabels ? "State / Province" : undefined}
                        value={data.stateCode || ''}
                        onChange={(val) => handleStateChange(String(val))}
                        disabled={disabled}
                        aria-label="State"
                        placeholder="Select State"
                        options={[
                            { value: '', label: 'Select State' },
                            ...MALAYSIA_STATES.map(s => ({ value: s.code, label: `${s.name} (${s.code})` }))
                        ]}
                    />
                ) : (
                    globalStates.length > 0 ? (
                        <Select
                            label={showLabels ? "State / Province" : undefined}
                            value={data.stateCode || ''}
                            onChange={(val) => handleStateChange(String(val))}
                            disabled={disabled}
                            aria-label="State"
                            placeholder="Select State"
                            options={[
                                { value: '', label: 'Select State' },
                                ...globalStates.map(s => ({ value: s.isoCode, label: `${s.name} (${s.isoCode})` }))
                            ]}
                        />
                    ) : (
                        <>
                            {showLabels && <label className="block text-sm font-medium text-muted-foreground mb-1">State / Province</label>}
                            <Input
                                value={data.state || ''}
                                onChange={(e) => onChange({ ...data, state: e.target.value, stateCode: '' })}
                                placeholder="State/Province Name"
                                disabled={disabled}
                            />
                        </>
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
