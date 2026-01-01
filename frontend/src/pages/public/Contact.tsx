import { useState } from 'react';
import { Envelope, PaperPlaneTilt, Chats } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function Contact() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        // Phase 1: Just show success state, no API call yet
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <GlassCard className="p-12 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                        <PaperPlaneTilt className="w-8 h-8" weight="fill" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Message Sent!</h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                        Thanks for reaching out. Our team will get back to you as soon as possible.
                    </p>
                    <Button onClick={() => setSubmitted(false)} variant="outline">
                        Send Another Message
                    </Button>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    Get in Touch
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Have questions about the tournament? Want to become a sponsor? We'd love to hear from you.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Contact Info */}
                <div className="md:col-span-1 space-y-6">
                    <GlassCard className="p-6 space-y-4 h-full">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Contact Info</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <Envelope className="w-6 h-6 text-blue-500 mt-1" />
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Email Us</p>
                                    <a href="mailto:support@athleticaos.com" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500">
                                        support@athleticaos.com
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Chats className="w-6 h-6 text-blue-500 mt-1" />
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Social</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        @AthleticaOS on all platforms
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Contact Form */}
                <div className="md:col-span-2">
                    <GlassCard className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                                    <Input placeholder="John" required className="bg-white/50 dark:bg-black/20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                                    <Input placeholder="Doe" required className="bg-white/50 dark:bg-black/20" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                                <Input type="email" placeholder="john@example.com" required className="bg-white/50 dark:bg-black/20" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
                                <select aria-label="Subject" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                    <option>General Inquiry</option>
                                    <option>Media & Press</option>
                                    <option>Sponsorship</option>
                                    <option>Tournament Organiser Support</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    placeholder="How can we help you?"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full py-3 text-lg font-semibold">
                                Send Message
                            </Button>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
