import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Trash, Plus, CheckCircle, WarningCircle, Clipboard } from '@phosphor-icons/react';
import { createBatchPlayers } from '@/api/players.api';
import { showToast } from '@/lib/customToast';

interface PlayerRow {
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    identificationType: string;
    icOrPassport: string;
    nationality: string;
    email: string;
    state: string;
    medicalNotes: string;
}

interface RowError {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dob?: string;
    identificationType?: string;
    icOrPassport?: string;
    nationality?: string;
    email?: string;
}

interface BulkPasteRosterModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    onSuccess: () => void;
}


export const BulkPasteRosterModal: React.FC<BulkPasteRosterModalProps> = ({
    isOpen,
    onClose,
    teamId,
    onSuccess
}) => {
    const [rows, setRows] = useState<PlayerRow[]>([]);
    const [errors, setErrors] = useState<{ [key: number]: RowError }>({});
    const [serverErrors, setServerErrors] = useState<{ [key: number]: string[] }>({});
    const [loading, setLoading] = useState(false);
    const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | null }>({});

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setRows([]);
            setErrors({});
            setServerErrors({});
        }
    }, [isOpen]);

    // Handle standard copy-paste tabular data parsing
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;

        const rawRows = text.split(/\r?\n/);
        const parsedRows: PlayerRow[] = [];

        rawRows.forEach((rowStr) => {
            const trimmed = rowStr.trim();
            if (!trimmed) return; // Skip empty rows

            const cells = trimmed.split('\t');
            
            // Map cells to exactly our 10 expected fields: First Name | Last Name | Gender | DOB | ID Type | IC/Passport | Nationality | Email | State | Medical Notes
            let rawType = (cells[4]?.trim() || '').toUpperCase();
            let idType = '';
            if (rawType === 'PASSPORT') idType = 'PASSPORT';
            else if (rawType === 'OTHER') idType = 'OTHER';
            else if (rawType === 'IC' || rawType === 'MALAYSIAN_IC' || rawType === 'MALAYSIAN IC') idType = 'MALAYSIAN_IC';
            else if (rawType) idType = rawType; // unknown non-blank string, will be caught by validation

            const newRow: PlayerRow = {
                firstName: cells[0]?.trim() || '',
                lastName: cells[1]?.trim() || '',
                gender: (cells[2]?.trim() || '').toUpperCase(),
                dob: cells[3]?.trim() || '',
                identificationType: idType,
                icOrPassport: cells[5]?.trim() || '',
                nationality: cells[6]?.trim() || '',
                email: cells[7]?.trim() || '',
                state: cells[8]?.trim() || '',
                medicalNotes: cells[9]?.trim() || '',
            };

            parsedRows.push(newRow);
        });

        if (parsedRows.length > 0) {
            const updatedRows = [...rows, ...parsedRows];
            setRows(updatedRows);
            validateAll(updatedRows);
            showToast.success(`Successfully parsed ${parsedRows.length} rows from clipboard!`);
        }
    };

    // Client-side local validations (Zod-like behavior)
    const validateRow = (row: PlayerRow): RowError => {
        const rowErr: RowError = {};
        
        if (!row.firstName) rowErr.firstName = 'First name is required';
        if (!row.lastName) rowErr.lastName = 'Last name is required';
        
        const genderVal = row.gender.toUpperCase();
        if (!row.gender) {
            rowErr.gender = 'Gender is required';
        } else if (genderVal !== 'MALE' && genderVal !== 'FEMALE' && genderVal !== 'OTHER') {
            rowErr.gender = 'Gender must be MALE, FEMALE, or OTHER';
        }

        // Validate date: YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!row.dob) {
            rowErr.dob = 'Date of birth is required';
        } else if (!dateRegex.test(row.dob)) {
            rowErr.dob = 'DOB must be YYYY-MM-DD';
        } else {
            const parsedDate = new Date(row.dob);
            if (isNaN(parsedDate.getTime()) || parsedDate >= new Date()) {
                rowErr.dob = 'DOB must be a valid past date';
            }
        }

        const validTypes = ['MALAYSIAN_IC', 'PASSPORT', 'OTHER'];
        if (!row.identificationType) {
            rowErr.identificationType = 'ID Type is required';
        } else if (!validTypes.includes(row.identificationType)) {
            rowErr.identificationType = 'ID Type must be MALAYSIAN_IC, PASSPORT, or OTHER';
        }
        if (!row.icOrPassport) rowErr.icOrPassport = 'IC or Passport is required';
        if (!row.nationality) rowErr.nationality = 'Nationality is required';

        if (row.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email)) {
                rowErr.email = 'Invalid email format';
            }
        }

        return rowErr;
    };

    const validateAll = (dataToValidate: PlayerRow[]) => {
        const newErrors: { [key: number]: RowError } = {};
        dataToValidate.forEach((row, idx) => {
            const errs = validateRow(row);
            if (Object.keys(errs).length > 0) {
                newErrors[idx] = errs;
            }
        });
        setErrors(newErrors);
    };

    // Handle single cell modification
    const handleCellChange = (rowIndex: number, field: keyof PlayerRow, value: string) => {
        const updatedRows = [...rows];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
        setRows(updatedRows);

        // Update validation errors
        const rowErr = validateRow(updatedRows[rowIndex]);
        setErrors(prev => {
            const updated = { ...prev };
            if (Object.keys(rowErr).length > 0) {
                updated[rowIndex] = rowErr;
            } else {
                delete updated[rowIndex];
            }
            return updated;
        });

        // Clear server error if user edits the row
        if (serverErrors[rowIndex]) {
            setServerErrors(prev => {
                const updated = { ...prev };
                delete updated[rowIndex];
                return updated;
            });
        }
    };

    const addEmptyRow = () => {
        const newRow: PlayerRow = {
            firstName: '',
            lastName: '',
            gender: 'MALE',
            dob: '',
            identificationType: '',
            icOrPassport: '',
            nationality: 'Malaysia',
            email: '',
            state: '',
            medicalNotes: '',
        };
        const updated = [...rows, newRow];
        setRows(updated);
        validateAll(updated);
    };

    const deleteRow = (idx: number) => {
        const updated = rows.filter((_, i) => i !== idx);
        setRows(updated);
        validateAll(updated);
        
        // Clean up errors mapping indices
        setServerErrors(prev => {
            const updatedServer = { ...prev };
            delete updatedServer[idx];
            return updatedServer;
        });
    };

    // Arrow Key + Enter Cell Navigation
    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        const el = e.target as HTMLInputElement;
        const cursorPosition = el.selectionStart;
        const textLength = el.value?.length || 0;

        if (e.key === 'ArrowUp') {
            const nextEl = cellRefs.current[`${rowIndex - 1}-${colIndex}`];
            if (nextEl) {
                e.preventDefault();
                nextEl.focus();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
            const nextEl = cellRefs.current[`${rowIndex + 1}-${colIndex}`];
            if (nextEl) {
                e.preventDefault();
                nextEl.focus();
            }
        } else if (e.key === 'ArrowLeft') {
            if (cursorPosition === 0 || cursorPosition === null) {
                const nextEl = cellRefs.current[`${rowIndex}-${colIndex - 1}`];
                if (nextEl) {
                    e.preventDefault();
                    nextEl.focus();
                }
            }
        } else if (e.key === 'ArrowRight') {
            if (cursorPosition === textLength || cursorPosition === null) {
                const nextEl = cellRefs.current[`${rowIndex}-${colIndex + 1}`];
                if (nextEl) {
                    e.preventDefault();
                    nextEl.focus();
                }
            }
        }
    };

    // Submit batch data to server
    const handleSubmit = async () => {
        if (rows.length === 0) return;

        // Perform final local check
        validateAll(rows);
        if (Object.keys(errors).length > 0) {
            showToast.error('Please fix validation errors in the table before uploading.');
            return;
        }

        setLoading(true);
        setServerErrors({});

        try {
            const response = await createBatchPlayers(teamId, rows);
            const data = response.data;

            if (data.failCount === 0) {
                showToast.success(`Successfully uploaded all ${data.successCount} players!`);
                onSuccess();
                onClose();
            } else {
                showToast.error(`Saved ${data.successCount} players, but ${data.failCount} rows failed constraint checks.`);
                
                // Map failures to grid errors and remove successful rows from state
                const newServerErrors: { [key: number]: string[] } = {};
                const remainingRows: PlayerRow[] = [];
                const successfulIndices = new Set<number>();

                data.results.forEach((res: any) => {
                    if (res.status === 'ERROR') {
                        newServerErrors[remainingRows.length] = res.errors || ['Server validation failed'];
                        remainingRows.push(rows[res.index]);
                    } else {
                        successfulIndices.add(res.index);
                    }
                });

                setRows(remainingRows);
                setServerErrors(newServerErrors);
                validateAll(remainingRows);
            }
        } catch (error: any) {
            showToast.error(error.response?.data?.message || ' Roster upload failed.');
        } finally {
            setLoading(false);
        }
    };

    const hasValidationErrors = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Paste Roster" size="xl">
            <div className="space-y-4 max-h-[80vh] flex flex-col">
                {/* 1. Paste instructions or area */}
                {rows.length === 0 ? (
                    <div
                        onPaste={handlePaste}
                        contentEditable
                        suppressContentEditableWarning
                        className="border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 rounded-xl p-12 text-center cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[220px] flex flex-col justify-center items-center gap-4 group"
                    >
                        <Clipboard className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div>
                            <p className="text-foreground font-semibold text-lg">Click here and Paste (Cmd+V / Ctrl+V)</p>
                            <p className="text-muted-foreground text-sm mt-1 max-w-md">
                                Copy columns from Excel/Google Sheets in this order:
                            </p>
                            <div className="text-[10px] text-primary/70 bg-primary-500/10 border border-primary-500/20 px-3 py-1.5 rounded-lg mt-3 font-mono font-medium tracking-wide">
                                First Name | Last Name | Gender (MALE/FEMALE) | DOB (YYYY-MM-DD) | ID Type (MALAYSIAN_IC/PASSPORT/OTHER) | IC/Passport | Nationality | Email | State | Medical Notes
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        {/* Summary / Tip Banner */}
                        <div className="flex justify-between items-center bg-white/5 p-4 border border-white/10 rounded-lg text-sm">
                            <div className="text-muted-foreground">
                                Pasted <strong className="text-foreground">{rows.length}</strong> rows. Required columns marked with <span className="text-red-500 font-bold">*</span>. Use Arrow Keys to navigate.
                            </div>
                            <Button onClick={addEmptyRow} size="sm" className="gap-1.5 py-1 px-3">
                                <Plus className="w-4 h-4" /> Add Row
                            </Button>
                        </div>

                        {/* Staging Data Table */}
                        <div className="flex-1 overflow-auto border border-white/10 rounded-lg custom-scrollbar">
                            <table className="min-w-full divide-y divide-white/5 text-xs text-foreground">
                                <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10 border-b border-white/10">
                                    <tr>
                                        <th className="px-3 py-3 text-left w-12 font-semibold">Status</th>
                                        <th className="px-3 py-3 text-left font-semibold">First Name <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">Last Name <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">Gender <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">DOB <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">ID Type <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">IC / Passport <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">Nationality <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 text-left font-semibold">Email</th>
                                        <th className="px-3 py-3 text-left font-semibold">State</th>
                                        <th className="px-3 py-3 text-left font-semibold">Medical Notes</th>
                                        <th className="px-3 py-3 text-center w-12 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-black/10">
                                    {rows.map((row, rIdx) => {
                                        const hasRowErrors = errors[rIdx] && Object.keys(errors[rIdx]).length > 0;
                                        const rowServerErrors = serverErrors[rIdx];
                                        const isRowInvalid = hasRowErrors || (rowServerErrors && rowServerErrors.length > 0);

                                        return (
                                            <tr key={rIdx} className={isRowInvalid ? "bg-red-500/5 hover:bg-red-500/10 transition-colors" : "hover:bg-white/5 transition-colors"}>
                                                {/* Status Indicator */}
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    {isRowInvalid ? (
                                                        <div className="group relative flex justify-center cursor-pointer">
                                                            <WarningCircle className="w-5 h-5 text-red-500" />
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block bg-red-950/95 border border-red-500/50 p-2.5 rounded-lg text-[10px] w-64 text-left shadow-xl z-20 space-y-1">
                                                                {errors[rIdx] && Object.values(errors[rIdx]).map((msg, eIdx) => (
                                                                    <div key={eIdx}>• {msg}</div>
                                                                ))}
                                                                {rowServerErrors && rowServerErrors.map((msg, eIdx) => (
                                                                    <div key={eIdx}>• {msg}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Cells inputs */}
                                                {[
                                                    { field: 'firstName', colIdx: 0 },
                                                    { field: 'lastName', colIdx: 1 }
                                                ].map((col) => {
                                                    const fieldName = col.field as keyof PlayerRow;
                                                    const fieldErr = errors[rIdx]?.[fieldName as keyof RowError];
                                                    return (
                                                        <td key={col.field} className="px-1 py-1">
                                                            <input
                                                                ref={el => { cellRefs.current[`${rIdx}-${col.colIdx}`] = el; }}
                                                                type="text"
                                                                value={row[fieldName]}
                                                                onChange={e => handleCellChange(rIdx, fieldName, e.target.value)}
                                                                onKeyDown={e => handleKeyDown(e, rIdx, col.colIdx)}
                                                                className={`w-full px-2 py-1.5 bg-transparent text-xs text-foreground focus:outline-none focus:bg-white/5 border rounded transition-all placeholder-white/20 ${fieldErr ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-white/20'}`}
                                                                placeholder="Enter value"
                                                            />
                                                        </td>
                                                    );
                                                })}

                                                {/* Gender Select */}
                                                <td className="px-1 py-1">
                                                    <select
                                                        ref={el => { cellRefs.current[`${rIdx}-2`] = el; }}
                                                        value={row.gender}
                                                        onChange={e => handleCellChange(rIdx, 'gender', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, rIdx, 2)}
                                                        className={`w-full px-2 py-1.5 bg-black text-xs text-foreground focus:outline-none focus:bg-white/5 border rounded transition-all ${errors[rIdx]?.gender ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-white/20'}`}
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="MALE">MALE</option>
                                                        <option value="FEMALE">FEMALE</option>
                                                        <option value="OTHER">OTHER</option>
                                                    </select>
                                                </td>

                                                {/* DOB Input */}
                                                <td className="px-1 py-1">
                                                    <input
                                                        ref={el => { cellRefs.current[`${rIdx}-3`] = el; }}
                                                        type="text"
                                                        value={row.dob}
                                                        onChange={e => handleCellChange(rIdx, 'dob', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, rIdx, 3)}
                                                        placeholder="YYYY-MM-DD"
                                                        className={`w-full px-2 py-1.5 bg-transparent text-xs text-foreground focus:outline-none focus:bg-white/5 border rounded transition-all placeholder-white/20 ${errors[rIdx]?.dob ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-white/20'}`}
                                                    />
                                                </td>

                                                {/* ID Type Select */}
                                                <td className="px-1 py-1">
                                                    <select
                                                        ref={el => { cellRefs.current[`${rIdx}-4`] = el; }}
                                                        value={row.identificationType}
                                                        onChange={e => handleCellChange(rIdx, 'identificationType', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, rIdx, 4)}
                                                        className={`w-full px-2 py-1.5 bg-black text-xs text-foreground focus:outline-none focus:bg-white/5 border rounded transition-all ${errors[rIdx]?.identificationType ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-white/20'}`}
                                                    >
                                                        <option value="" disabled>Select Type</option>
                                                        <option value="MALAYSIAN_IC">MALAYSIAN_IC</option>
                                                        <option value="PASSPORT">PASSPORT</option>
                                                        <option value="OTHER">OTHER</option>
                                                        {row.identificationType && !['MALAYSIAN_IC', 'PASSPORT', 'OTHER'].includes(row.identificationType) && (
                                                            <option value={row.identificationType}>{row.identificationType} (Invalid)</option>
                                                        )}
                                                    </select>
                                                </td>

                                                {/* IC, Nationality, Email, State, Medical Notes */}
                                                {[
                                                    { field: 'icOrPassport', colIdx: 5, placeholder: 'IC/Passport' },
                                                    { field: 'nationality', colIdx: 6, placeholder: 'Nationality' },
                                                    { field: 'email', colIdx: 7, placeholder: 'Email' },
                                                    { field: 'state', colIdx: 8, placeholder: 'State' },
                                                    { field: 'medicalNotes', colIdx: 9, placeholder: 'Notes' }
                                                ].map((col) => {
                                                    const fieldName = col.field as keyof PlayerRow;
                                                    const fieldErr = errors[rIdx]?.[fieldName as keyof RowError];
                                                    return (
                                                        <td key={col.field} className="px-1 py-1">
                                                            <input
                                                                ref={el => { cellRefs.current[`${rIdx}-${col.colIdx}`] = el; }}
                                                                type="text"
                                                                value={row[fieldName]}
                                                                onChange={e => handleCellChange(rIdx, fieldName, e.target.value)}
                                                                onKeyDown={e => handleKeyDown(e, rIdx, col.colIdx)}
                                                                placeholder={col.placeholder}
                                                                className={`w-full px-2 py-1.5 bg-transparent text-xs text-foreground focus:outline-none focus:bg-white/5 border rounded transition-all placeholder-white/20 ${fieldErr ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-white/20'}`}
                                                            />
                                                        </td>
                                                    );
                                                })}

                                                {/* Trash can delete row */}
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => deleteRow(rIdx)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all focus:outline-none"
                                                        aria-label="Delete row"
                                                    >
                                                        <Trash className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-2">
                    <div>
                        {rows.length > 0 && (
                            <button
                                onClick={() => { setRows([]); setErrors({}); setServerErrors({}); }}
                                className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-all"
                            >
                                Clear Grid and Paste Again
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        {rows.length > 0 && (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || hasValidationErrors}
                                className="gap-2"
                            >
                                {loading ? 'Saving...' : 'Submit Roster'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
