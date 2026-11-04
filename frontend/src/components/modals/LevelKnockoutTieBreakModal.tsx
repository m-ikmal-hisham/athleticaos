import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Trophy, Clock, Flag, Coin, ArrowRight } from '@phosphor-icons/react';
import { MatchResponse, TournamentFormatConfig, FirstTrySuggestionResponse } from '@/types';
import { decideLevelKnockout, getFirstTrySuggestion } from '@/api/matches.api';
import { showToast } from '@/lib/customToast';

interface LevelKnockoutTieBreakModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: MatchResponse;
    calculatedScores: { homeScore: number; awayScore: number };
    formatConfig: TournamentFormatConfig | null;
    onStartExtraTime: (minutes: number) => void;
    onSuccess: () => Promise<void>;
}

export const LevelKnockoutTieBreakModal: React.FC<LevelKnockoutTieBreakModalProps> = ({
    isOpen,
    onClose,
    match,
    calculatedScores,
    formatConfig,
    onStartExtraTime,
    onSuccess,
}) => {
    const { t } = useTranslation(['match', 'tournament', 'common']);

    const configuredMethod = formatConfig?.knockoutTieBreaker || 'EXTRA_TIME';
    const isFifteens = formatConfig?.rugbyFormat === 'XV';
    const configuredMinutes = formatConfig?.extraTimeMinutes || (isFifteens ? 15 : 5);

    const [activeTab, setActiveTab] = useState<'FIRST_TRY' | 'EXTRA_TIME' | 'DROP_KICKS' | 'COIN_TOSS'>('EXTRA_TIME');
    const [loading, setLoading] = useState(false);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<FirstTrySuggestionResponse | null>(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');

    // Drop kicks state
    const [dropKicksHome, setDropKicksHome] = useState<string>('0');
    const [dropKicksAway, setDropKicksAway] = useState<string>('0');

    // Coin toss state
    const [coinTossWinnerId, setCoinTossWinnerId] = useState<string>('');

    const homeId = match.homeTeamId || '';
    const awayId = match.awayTeamId || '';
    const homeName = match.homeTeamName || 'Home';
    const awayName = match.awayTeamName || 'Away';

    const getErrorMessage = (err: unknown, fallback: string): string => {
        if (typeof err === 'object' && err !== null && 'response' in err) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            if (resp?.data?.message) return resp.data.message;
        }
        if (err instanceof Error) return err.message;
        return fallback;
    };

    useEffect(() => {
        if (!isOpen) return;

        const loadSuggestion = async () => {
            try {
                setSuggestionLoading(true);
                const res = await getFirstTrySuggestion(match.id);
                setSuggestion(res.data);
                if (res.data.hasTryEvents && res.data.suggestedWinnerTeamId) {
                    setSelectedWinnerId(res.data.suggestedWinnerTeamId);
                } else {
                    setSelectedWinnerId(homeId);
                }
            } catch (err) {
                console.error('Failed to load first-try suggestion', err);
                setSuggestion(null);
            } finally {
                setSuggestionLoading(false);
            }
        };

        // Reset to category default
        if (configuredMethod === 'FIRST_TRY') {
            setActiveTab('FIRST_TRY');
            loadSuggestion();
        } else {
            setActiveTab('EXTRA_TIME');
        }

        setSelectedWinnerId(homeId);
        setCoinTossWinnerId(homeId);
        setDropKicksHome('0');
        setDropKicksAway('0');
    }, [isOpen, match.id, configuredMethod, homeId]);

    const handleConfirmFirstTry = async () => {
        if (!selectedWinnerId) {
            showToast.error(t('match:tieBreak.pickWinner'));
            return;
        }
        setLoading(true);
        try {
            await decideLevelKnockout(match.id, {
                method: 'FIRST_TRY',
                winnerTeamId: selectedWinnerId,
            });
            showToast.success(t('match:tieBreak.shortFirstTry') + ' recorded');
            await onSuccess();
            onClose();
        } catch (error: unknown) {
            showToast.error(getErrorMessage(error, 'Failed to decide match'));
        } finally {
            setLoading(false);
        }
    };

    const handleStartET = () => {
        onStartExtraTime(configuredMinutes);
        onClose();
    };

    const handleConfirmDropKicks = async () => {
        const dkH = parseInt(dropKicksHome, 10);
        const dkA = parseInt(dropKicksAway, 10);

        if (isNaN(dkH) || isNaN(dkA) || dkH < 0 || dkA < 0 || dkH > 20 || dkA > 20) {
            showToast.error('Please enter valid drop kick tallies between 0 and 20.');
            return;
        }

        if (dkH === dkA) {
            showToast.error(t('match:tieBreak.dropKicksLevelPrompt'));
            setActiveTab('COIN_TOSS');
            return;
        }

        const winnerId = dkH > dkA ? homeId : awayId;
        setLoading(true);
        try {
            await decideLevelKnockout(match.id, {
                method: 'DROP_KICKS',
                winnerTeamId: winnerId,
                dropKicksHome: dkH,
                dropKicksAway: dkA,
            });
            showToast.success(t('match:tieBreak.shortDropKicks', { home: dkH, away: dkA }) + ' recorded');
            await onSuccess();
            onClose();
        } catch (error: unknown) {
            showToast.error(getErrorMessage(error, 'Failed to decide match'));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCoinToss = async () => {
        if (!coinTossWinnerId) {
            showToast.error(t('match:tieBreak.pickWinner'));
            return;
        }
        setLoading(true);
        const dkH = parseInt(dropKicksHome, 10);
        const dkA = parseInt(dropKicksAway, 10);
        const hasDk = !isNaN(dkH) && !isNaN(dkA) && dkH === dkA && dkH > 0;

        try {
            await decideLevelKnockout(match.id, {
                method: 'COIN_TOSS',
                winnerTeamId: coinTossWinnerId,
                dropKicksHome: hasDk ? dkH : undefined,
                dropKicksAway: hasDk ? dkA : undefined,
            });
            showToast.success(t('match:tieBreak.shortCoinToss') + ' recorded');
            await onSuccess();
            onClose();
        } catch (error: unknown) {
            showToast.error(getErrorMessage(error, 'Failed to decide match'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('match:tieBreak.levelAtFullTime')}>
            <div className="space-y-5">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                    <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-bold text-sm text-amber-900 dark:text-amber-100">
                            {t('match:tieBreak.decideKnockoutTitle')}
                        </div>
                        <p className="mt-0.5">
                            {t('match:tieBreak.decideKnockoutHint')} ({homeName} {calculatedScores.homeScore} - {calculatedScores.awayScore} {awayName})
                        </p>
                    </div>
                </div>

                {/* Tab Navigation when falling through to ET sequence */}
                <div className="flex border-b border-border/50 gap-2 pb-1 text-xs">
                    {configuredMethod === 'FIRST_TRY' && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('FIRST_TRY')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                activeTab === 'FIRST_TRY'
                                    ? 'bg-primary text-white'
                                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {t('match:tieBreak.firstTryTitle')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveTab('EXTRA_TIME')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            activeTab === 'EXTRA_TIME'
                                ? 'bg-primary text-white'
                                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {t('match:tieBreak.shortExtraTime')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('DROP_KICKS')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            activeTab === 'DROP_KICKS'
                                ? 'bg-primary text-white'
                                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {t('match:tieBreak.dropKicksTitle')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('COIN_TOSS')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            activeTab === 'COIN_TOSS'
                                ? 'bg-primary text-white'
                                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {t('match:tieBreak.coinTossTitle')}
                    </button>
                </div>

                {/* FIRST TRY STEP */}
                {activeTab === 'FIRST_TRY' && (
                    <div className="space-y-4">
                        {suggestionLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Loading first-try event...
                            </div>
                        ) : suggestion?.hasTryEvents ? (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-3">
                                <div className="text-sm font-semibold text-content-primary">
                                    {t('match:tieBreak.firstTrySuggestion', {
                                        team: suggestion.suggestedWinnerTeamName,
                                        minute: suggestion.minute ?? '—',
                                    })}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">
                                        {t('match:tieBreak.pickWinner')}
                                    </label>
                                    <Select
                                        value={selectedWinnerId}
                                        onChange={(val) => setSelectedWinnerId(String(val))}
                                        options={[
                                            { value: homeId, label: `${homeName} (Home)` },
                                            { value: awayId, label: `${awayName} (Away)` },
                                        ]}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-3">
                                <div className="text-sm font-medium text-content-secondary">
                                    {t('match:tieBreak.noTryHint')}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">
                                        {t('match:tieBreak.pickWinner')}
                                    </label>
                                    <Select
                                        value={selectedWinnerId}
                                        onChange={(val) => setSelectedWinnerId(String(val))}
                                        options={[
                                            { value: homeId, label: `${homeName} (Home)` },
                                            { value: awayId, label: `${awayName} (Away)` },
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveTab('EXTRA_TIME')}
                                className="w-full sm:w-auto text-xs"
                            >
                                {t('match:tieBreak.noTryScored')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                isLoading={loading}
                                onClick={handleConfirmFirstTry}
                                className="w-full sm:w-auto"
                            >
                                {t('match:tieBreak.confirmFirstTryWinner', {
                                    team: selectedWinnerId === homeId ? homeName : awayName,
                                })}
                            </Button>
                        </div>
                    </div>
                )}

                {/* EXTRA TIME STEP */}
                {activeTab === 'EXTRA_TIME' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Clock className="w-5 h-5 text-primary" />
                                <span>{t('match:tieBreak.startExtraTime', { minutes: configuredMinutes })}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Keeps the match in progress with a {configuredMinutes}-minute clock. First score of any kind (golden score) wins the match.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveTab('DROP_KICKS')}
                                className="w-full sm:w-auto text-xs"
                            >
                                {t('match:tieBreak.extraTimeEndedLevel')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleStartET}
                                className="w-full sm:w-auto"
                            >
                                {t('match:tieBreak.startExtraTime', { minutes: configuredMinutes })}
                            </Button>
                        </div>
                    </div>
                )}

                {/* DROP KICKS STEP */}
                {activeTab === 'DROP_KICKS' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Flag className="w-5 h-5 text-primary" />
                                <span>{t('match:tieBreak.dropKicksTitle')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter the number of successful drop kicks scored by each team (best of 3, or sudden death tally).
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold">{homeName}</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={dropKicksHome}
                                        onChange={(e) => setDropKicksHome(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold">{awayName}</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={dropKicksAway}
                                        onChange={(e) => setDropKicksAway(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveTab('COIN_TOSS')}
                                className="w-full sm:w-auto text-xs"
                            >
                                {t('match:tieBreak.dropKicksLevelPrompt')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                isLoading={loading}
                                onClick={handleConfirmDropKicks}
                                className="w-full sm:w-auto"
                            >
                                {t('match:tieBreak.confirmDropKicks')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* COIN TOSS STEP */}
                {activeTab === 'COIN_TOSS' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Coin className="w-5 h-5 text-primary" />
                                <span>{t('match:tieBreak.coinTossTitle')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('match:tieBreak.coinTossPrompt')}
                            </p>

                            <div className="space-y-2 pt-1">
                                <Select
                                    value={coinTossWinnerId}
                                    onChange={(val) => setCoinTossWinnerId(String(val))}
                                    options={[
                                        { value: homeId, label: `${homeName} (Home)` },
                                        { value: awayId, label: `${awayName} (Away)` },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button type="button" variant="cancel" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                isLoading={loading}
                                onClick={handleConfirmCoinToss}
                            >
                                {t('match:tieBreak.confirmCoinToss')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

