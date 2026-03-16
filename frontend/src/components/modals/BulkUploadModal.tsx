import React, { useState, useRef } from 'react';
import { UploadSimple, X, CheckCircle, WarningCircle, Table as TableIcon } from '@phosphor-icons/react';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    expectedColumns: string[];
    onUpload: (data: any[]) => Promise<void>;
    sampleCsvHeader: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
    isOpen,
    onClose,
    title,
    expectedColumns,
    onUpload,
    sampleCsvHeader
}) => {
    const [, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setErrors(results.errors.map(err => err.message));
                    return;
                }
                
                const fileHeaders = results.meta.fields || [];
                setHeaders(fileHeaders);
                
                // Validate headers
                const missingColumns = expectedColumns.filter(col => !fileHeaders.includes(col));
                if (missingColumns.length > 0) {
                    setErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
                    setParsedData([]);
                } else {
                    setErrors([]);
                    setParsedData(results.data);
                }
            },
            error: (error) => {
                setErrors([error.message]);
            }
        });
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) return;
        
        setIsUploading(true);
        try {
            await onUpload(parsedData);
            toast.success(`Successfully uploaded ${parsedData.length} records!`);
            handleClose();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || "Upload failed. Please check data format.";
            toast.error(errorMessage);
            setErrors([errorMessage]);
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setHeaders([]);
        setErrors([]);
        onClose();
    };

    const downloadSample = () => {
        const blob = new Blob([sampleCsvHeader], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `sample_${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5 border-b pb-4">
                            <h3 className="text-xl font-semibold leading-6 text-gray-900 flex items-center gap-2">
                                <UploadSimple size={24} className="text-primary-600" />
                                {title}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500" aria-label="Close modal">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="mt-2 space-y-6">
                            {/* File Upload Area */}
                            {!parsedData.length && !errors.length && (
                                <div 
                                    className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="text-center">
                                        <TableIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                        <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                            <label className="relative cursor-pointer rounded-md bg-white font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                                                <span>Upload a CSV file</span>
                                                <input ref={fileInputRef} type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs leading-5 text-gray-600">CSV files only</p>
                                    </div>
                                </div>
                            )}

                            {/* Download Template Link */}
                            {!parsedData.length && (
                                <div className="flex justify-center">
                                    <button onClick={downloadSample} className="text-sm text-primary-600 hover:text-primary-800 underline flex items-center gap-1">
                                        Download Sample CSV Template
                                    </button>
                                </div>
                            )}

                            {/* Error Display */}
                            {errors.length > 0 && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <WarningCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">There were errors with your submission</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <ul role="list" className="list-disc space-y-1 pl-5">
                                                    {errors.map((error, idx) => (
                                                        <li key={idx}>{error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="mt-4">
                                                <button
                                                    onClick={() => { setErrors([]); setFile(null); }}
                                                    className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Data Preview */}
                            {parsedData.length > 0 && errors.length === 0 && (
                                <div className="mt-4">
                                    <h4 className="flex items-center gap-2 text-md font-medium text-green-700 mb-3">
                                        <CheckCircle size={20} />
                                        Parsed {parsedData.length} records successfully. Preview:
                                    </h4>
                                    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg max-h-96">
                                        <table className="min-w-full divide-y divide-gray-300">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    {headers.map(header => (
                                                        <th key={header} scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">
                                                            {header}
                                                            {expectedColumns.includes(header) && <span className="text-red-500 ml-1">*</span>}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {parsedData.slice(0, 50).map((row, rowIdx) => (
                                                    <tr key={rowIdx}>
                                                        {headers.map(header => (
                                                            <td key={header} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                {row[header]?.toString() || ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {parsedData.length > 50 && (
                                        <p className="text-xs text-gray-500 mt-2 italic">* Showing first 50 rows only.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t gap-2">
                        <button
                            type="button"
                            className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:w-auto disabled:opacity-50"
                            onClick={handleUpload}
                            disabled={parsedData.length === 0 || isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={handleClose}
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
