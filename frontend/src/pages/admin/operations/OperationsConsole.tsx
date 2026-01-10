import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import api from '@/api/axios';

interface OperationsDashboardDTO {
    liveMatches: number;
    pendingMatches: number;
    completedMatches: number;
    totalMatches: number;
    attentionRequired: {
        matchId: string;
        matchCode: string;
        homeTeamName: string;
        awayTeamName: string;
        issues: string[];
    }[];
}

const OperationsConsole: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<OperationsDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/matches/operations/dashboard');
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch operations dashboard", err);
                setError('Failed to load operations data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Poll every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-white">Loading Operations Console...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Operations Console</h1>
                    <p className="text-slate-400">Real-time tournament oversight</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors pointer-events-auto cursor-pointer">
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <p className="text-sm font-medium text-slate-400">Live Matches</p>
                    <p className="text-3xl font-bold text-emerald-400">{data?.liveMatches}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <p className="text-sm font-medium text-slate-400">Pending</p>
                    <p className="text-3xl font-bold text-blue-400">{data?.pendingMatches}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <p className="text-sm font-medium text-slate-400">Completed</p>
                    <p className="text-3xl font-bold text-slate-200">{data?.completedMatches}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <p className="text-sm font-medium text-slate-400">Attention Needed</p>
                    <p className={`text-3xl font-bold ${data?.attentionRequired.length ? 'text-red-500' : 'text-slate-500'}`}>
                        {data?.attentionRequired.length}
                    </p>
                </div>
            </div>

            {/* Attention Required Section */}
            {data?.attentionRequired && data.attentionRequired.length > 0 && (
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                        ⚠️ Immediate Action Required
                    </h3>
                    <div className="space-y-3">
                        {data.attentionRequired.map((item) => (
                            <div key={item.matchId} className="bg-slate-900/50 p-4 rounded-lg border border-red-500/10 flex justify-between items-center group hover:border-red-500/30 transition-all cursor-pointer"
                                onClick={() => navigate(`/admin/matches/${item.matchId}`)}>
                                <div>
                                    <div className="text-white font-medium">{item.homeTeamName} vs {item.awayTeamName}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">{item.matchCode}</div>
                                </div>
                                <div className="text-right">
                                    {item.issues.map((issue, idx) => (
                                        <div key={idx} className="text-red-400 text-sm font-medium">{issue}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State / Operational Status */}
            {(!data?.attentionRequired || data.attentionRequired.length === 0) && (
                <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
                        ✓
                    </div>
                    <h3 className="text-lg font-medium text-emerald-400">All Systems Operational</h3>
                    <p className="text-slate-400 mt-1">No pending alerts or validation errors found.</p>
                </div>
            )}
        </div>
    );
};

export default OperationsConsole;
