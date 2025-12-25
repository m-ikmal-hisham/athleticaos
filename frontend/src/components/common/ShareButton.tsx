import { useState, useRef, useEffect } from 'react';
import { ShareNetwork, Check, FacebookLogo, XLogo, WhatsappLogo, Link as LinkIcon, TiktokLogo, InstagramLogo } from '@phosphor-icons/react';
import { Button } from '@/components/Button';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

interface ShareButtonProps {
    title?: string;
    text?: string;
    url?: string;
    className?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'tertiary';
    size?: 'sm' | 'md' | 'lg';
    direction?: 'up' | 'down';
}

export const ShareButton = ({
    // title = 'Check this out!', // Unused
    text = 'Shared via AthleticaOS',
    url = window.location.href,
    className,
    variant = 'secondary',
    size = 'sm',
    direction = 'down'
}: ShareButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to copy', error);
            toast.error('Failed to copy link');
        }
    };

    const shareToSocial = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'tiktok' | 'instagram') => {
        let shareUrl = '';
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(text);

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                window.open(shareUrl, '_blank', 'noopener,noreferrer');
                setIsOpen(false);
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
                window.open(shareUrl, '_blank', 'noopener,noreferrer');
                setIsOpen(false);
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                window.open(shareUrl, '_blank', 'noopener,noreferrer');
                setIsOpen(false);
                break;
            case 'tiktok':
            case 'instagram':
                // For TikTok and Instagram, we copy the link and open the site
                // as they don't have standard web share intents for generic links
                await navigator.clipboard.writeText(url);
                toast.success('Link copied! Opening ' + (platform === 'tiktok' ? 'TikTok' : 'Instagram') + '...');
                setTimeout(() => {
                    window.open(`https://www.${platform}.com/`, '_blank', 'noopener,noreferrer');
                }, 1000);
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant={variant}
                size={size}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={clsx("gap-1.5", className)}
            >
                <ShareNetwork className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
                {/* <CaretDown className={clsx("w-3 h-3 transition-transform", isOpen && "rotate-180")} /> */}
            </Button>

            {isOpen && (
                <div
                    className={clsx(
                        "absolute right-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden transform transition-all",
                        direction === 'up' ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right",
                        "animation-fade-in-up"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Share to
                        </div>

                        <button
                            onClick={() => shareToSocial('facebook')}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                                <FacebookLogo weight="fill" className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">Facebook</span>
                        </button>

                        <button
                            onClick={() => shareToSocial('twitter')}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-black dark:text-white">
                                <XLogo weight="bold" className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">X / Twitter</span>
                        </button>

                        <button
                            onClick={() => shareToSocial('whatsapp')}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                                <WhatsappLogo weight="fill" className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">WhatsApp</span>
                        </button>

                        <button
                            onClick={() => shareToSocial('tiktok')}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#ff0050]/10 flex items-center justify-center text-[#ff0050]">
                                <TiktokLogo weight="fill" className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">TikTok</span>
                        </button>

                        <button
                            onClick={() => shareToSocial('instagram')}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#E1306C]/10 flex items-center justify-center text-[#E1306C]">
                                <InstagramLogo weight="fill" className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">Instagram</span>
                        </button>

                        <div className="my-1 border-t border-gray-100 dark:border-slate-700" />

                        <button
                            onClick={handleCopy}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                                {copied ? <Check weight="bold" className="w-5 h-5 text-green-500" /> : <LinkIcon weight="bold" className="w-5 h-5" />}
                            </div>
                            <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
