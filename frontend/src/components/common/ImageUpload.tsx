import React, { useState, useRef } from 'react';
import { Button } from '@/components/Button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from '@/lib/axios';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    className?: string;
    placeholder?: string;
    aspectRatio?: 'square' | 'video' | 'banner';
    label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    className = '',
    placeholder = 'Upload image',
    aspectRatio = 'square',
    label,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/v1/uploads', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const url = response.data.url;
            onChange(url);
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        onChange('');
    };

    // Helper to get display URL
    const getDisplayUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        const baseUrl = apiUrl.replace('/api/v1', '');
        return `${baseUrl}${url}`;
    };

    const getAspectRatioClass = () => {
        switch (aspectRatio) {
            case 'video': return 'aspect-video';
            case 'banner': return 'aspect-[3/1]';
            case 'square': default: return 'aspect-square';
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>}

            <div className={`relative overflow-hidden rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[200px] ${getAspectRatioClass()}`}>
                {value ? (
                    <>
                        <img
                            src={getDisplayUrl(value)}
                            alt="Uploaded"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                className="h-8 w-8 rounded-full opacity-80 hover:opacity-100 !p-0"
                                onClick={handleRemove}
                                title="Remove image"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                            <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 mb-3">
                                    <ImageIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {placeholder}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        SVG, PNG, JPG or GIF (max 5MB)
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Select File
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                title="Upload image file"
                aria-label="Upload image file"
            />
        </div>
    );
};
