import React, { useRef, useState } from 'react';
import axios from '@/lib/axios';
import { Button } from '@/components/Button';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    className?: string;
    label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, className, label = "Upload Image" }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | undefined>(value);

    // Sync preview with value prop if it changes externally
    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/v1/images/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const url = response.data.url; // Assuming backend returns { url: "/uploads/..." }
            onChange(url);
            setPreview(url);
        } catch (error) {
            console.error('Failed to upload image', error);
            // Optionally add toast error here
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <div className="flex items-center gap-4">
                {preview ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200">
                        <img src={preview.startsWith('http') ? preview : `http://localhost:8080${preview}`} alt="Preview" className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setPreview(undefined);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            aria-label="Remove image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        aria-label={label}
                    />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Choose Image'}
                    </Button>
                    <p className="text-xs text-slate-500">Max file size: 5MB. Formats: JPG, PNG, WEBP</p>
                </div>
            </div>
        </div>
    );
};
