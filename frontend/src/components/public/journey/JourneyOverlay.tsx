import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useId,
    useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Journey, Milestone } from '@/content/journey';
import { getRouteGroundPosition } from './fieldProjection';
import {
    BG_CAMERA_PRESETS,
    projectBgPoint,
    type BgCameraPreset,
} from '@/components/public/background/backgroundProjection';
import { SetPieceIcon, RugbyBallSVG } from './journeyIcons';

export interface JourneyOverlayProps {
    journey: Journey;
    selectedMilestone: Milestone;
    onSelectMilestone: (m: Milestone) => void;
    lang: 'en' | 'ms';
    visible: boolean;
    /** Viewport y of the hero title/switch block at scrollY 0; undefined until measured. */
    headerBlockBottom?: number;
    onFallbackCardNeeded?: (needed: boolean) => void;
}

// Phone phase card: gap above the tab bar/live pill, and clearance between the card top
// and the centre of the lowest milestone marker (22px half hit target + live ping ring + air).
const PHONE_CARD_GAP = 12;
const PHONE_MARKER_CLEARANCE = 30;
// Used only for the first (hidden) layout pass, before the collapsed card has been measured
const PHONE_CARD_ESTIMATE = 76;
// Milestone marker button size (w-11): phones keep markers at least this far apart when the route allows
const MARKER_HIT_TARGET = 44;

export function JourneyOverlay({
    journey,
    selectedMilestone,
    onSelectMilestone,
    lang,
    visible,
    headerBlockBottom: headerBlockBottomProp,
    onFallbackCardNeeded,
}: JourneyOverlayProps) {
    const { t } = useTranslation('journey');
    const animId = useId();
    const isHeaderMeasured = headerBlockBottomProp !== undefined;
    const headerBlockBottom = headerBlockBottomProp ?? 0;

    // 1. Viewport & Breakpoint Tracking
    const [viewport, setViewport] = useState(() => ({
        w: typeof window !== 'undefined' ? window.innerWidth : 1440,
        h: typeof window !== 'undefined' ? window.innerHeight : 900,
    }));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setViewport({
                w: window.innerWidth,
                h: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    const isDesktop = viewport.w >= 1024;
    const preset: BgCameraPreset = isDesktop ? 'bgStadiumSideline' : 'bgStadiumEnd';
    const camParam = BG_CAMERA_PRESETS[preset];

    // 1. Phone bottom clearance: read the existing CSS variable --public-bottom-chrome
    // from the PublicLayout root (getComputedStyle) and recompute when it changes (live accessory shown/hidden, resize).
    const [bottomChrome, setBottomChrome] = useState(0);
    const [isBottomChromeMeasured, setIsBottomChromeMeasured] = useState(false);
    const updateBottomChrome = useCallback(() => {
        if (typeof document === 'undefined') return;
        const rootEl = document.querySelector('[data-animated-bg]') as HTMLElement | null;
        if (!rootEl) return;

        // Desktop (lg: >= 1024px) has no floating tab bar, bottom chrome is 0
        if (window.innerWidth >= 1024) {
            setBottomChrome(0);
            setIsBottomChromeMeasured(true);
            return;
        }

        const computed = window.getComputedStyle(rootEl);
        const journeyVar = computed.getPropertyValue('--journey-bottom-chrome').trim();
        const cssVar = journeyVar || computed.getPropertyValue('--public-bottom-chrome').trim();

        // On mobile (< 1024px), if --journey-bottom-chrome is defined, evaluate it via probe
        // to preserve the dynamic clearance (80px vs 140px). Fallback to computed.paddingBottom.
        let px = 0;
        if (cssVar) {
            const probe = document.createElement('div');
            probe.style.position = 'absolute';
            probe.style.visibility = 'hidden';
            probe.style.height = cssVar;
            rootEl.appendChild(probe);
            px = parseFloat(window.getComputedStyle(probe).height);
            rootEl.removeChild(probe);
        }
        if (!Number.isFinite(px) || px <= 0) {
            px = parseFloat(computed.paddingBottom);
        }

        setBottomChrome(Number.isFinite(px) && px > 0 ? px : 0);
        setIsBottomChromeMeasured(true);
    }, []);

    useEffect(() => {
        updateBottomChrome();
        window.addEventListener('resize', updateBottomChrome);
        window.addEventListener('orientationchange', updateBottomChrome);

        let observer: MutationObserver | null = null;
        const attachObserver = () => {
            const rootEl = document.querySelector('[data-animated-bg]');
            if (rootEl) {
                observer = new MutationObserver(updateBottomChrome);
                observer.observe(rootEl, { attributes: true, attributeFilter: ['style', 'class'] });
            }
        };

        attachObserver();
        if (!observer) {
            const animFrame = requestAnimationFrame(attachObserver);
            return () => {
                cancelAnimationFrame(animFrame);
                window.removeEventListener('resize', updateBottomChrome);
                window.removeEventListener('orientationchange', updateBottomChrome);
                observer?.disconnect();
            };
        }

        return () => {
            window.removeEventListener('resize', updateBottomChrome);
            window.removeEventListener('orientationchange', updateBottomChrome);
            observer?.disconnect();
        };
    }, [updateBottomChrome]);

    // 2. Exact xMidYMid slice Math to Screen Pixels
    const projectToScreen = useCallback(
        (gx: number, gz: number) => {
            const pt = projectBgPoint(gx, gz, preset);
            const scale = Math.max(viewport.w / camParam.fullWidth, viewport.h / camParam.fullHeight);
            const offsetX = (viewport.w - camParam.fullWidth * scale) / 2;
            const offsetY = (viewport.h - camParam.fullHeight * scale) / 2;
            return {
                x: pt.x * scale + offsetX,
                y: pt.y * scale + offsetY,
                depthScale: pt.depthScale,
            };
        },
        [preset, camParam, viewport.w, viewport.h]
    );

    // 3. Dev-Only Alignment Assertion (Matches PitchBackdropSvg Within 1 px)
    useEffect(() => {
        if (!import.meta.env.DEV || typeof document === 'undefined') return;

        const checkAlignment = () => {
            const svg = document.getElementById('pitch-backdrop-svg') as SVGSVGElement | null;
            if (!svg) return;
            const ctm = svg.getScreenCTM();
            if (!ctm) return;

            const corners = [
                { name: 'ourDeadNear', x: 0, z: 0 },
                { name: 'farDeadNear', x: 120, z: 0 },
                { name: 'farDeadFar', x: 120, z: 70 },
                { name: 'ourDeadFar', x: 0, z: 70 },
            ];

            for (const c of corners) {
                const overlayScreen = projectToScreen(c.x, c.z);
                const bgVbPoint = projectBgPoint(c.x, c.z, preset);
                const svgPt = svg.createSVGPoint();
                svgPt.x = bgVbPoint.x;
                svgPt.y = bgVbPoint.y;
                const svgScreenPt = svgPt.matrixTransform(ctm);

                const diff = Math.hypot(overlayScreen.x - svgScreenPt.x, overlayScreen.y - svgScreenPt.y);
                console.assert(
                    diff <= 1.0,
                    `[OverlayAlignment] Divergence at ${c.name} (${c.x}, ${c.z}): diff = ${diff.toFixed(3)} px > 1 px`
                );
            }
        };

        const timer = setTimeout(checkAlignment, 500);
        return () => clearTimeout(timer);
    }, [projectToScreen, preset]);

    // 4. Milestone Markers & Equal Screen Arc-Length Spacing
    const milestones = journey.milestones;
    const milestoneCount = milestones.length;

    const selectedMilestoneIndex = useMemo(() => {
        const idx = milestones.findIndex((m) => m.id === selectedMilestone.id);
        return idx >= 0 ? idx : 0;
    }, [milestones, selectedMilestone.id]);

    const currentMilestoneIndex = useMemo(() => {
        const idx = milestones.findIndex((m) => m.status === 'current');
        return idx >= 0 ? idx : milestoneCount - 1;
    }, [milestones, milestoneCount]);

    const [focusedMilestoneId, setFocusedMilestoneId] = useState<string | null>(null);
    const leaveTimer = useRef<number | null>(null);

    const hoverMilestone = useCallback((id: string | null) => {
        if (leaveTimer.current !== null) {
            window.clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
        }
        if (id) {
            setFocusedMilestoneId(id);
        } else {
            leaveTimer.current = window.setTimeout(() => setFocusedMilestoneId(null), 80);
        }
    }, []);

    useEffect(() => () => {
        if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    }, []);

    const activeHoverIndex = useMemo(() => {
        if (focusedMilestoneId) {
            const idx = milestones.findIndex((m) => m.id === focusedMilestoneId);
            if (idx >= 0) return idx;
        }
        return null;
    }, [focusedMilestoneId, milestones]);

    // Single active label pill: hovered/focused else selected (Never both!)
    const activeLabelIndex = activeHoverIndex !== null ? activeHoverIndex : selectedMilestoneIndex;

    // Phones: the phase card is anchored above --journey-bottom-chrome (tab bar + live pill +
    // safe area). Its collapsed height is measured so the route fit can keep every milestone
    // marker above it. The value is kept while the card is expanded.
    const phoneCardRef = useRef<HTMLDivElement>(null);
    const [collapsedCardH, setCollapsedCardH] = useState<number | null>(null);
    const phoneSafeBottom = isDesktop
        ? null
        : viewport.h -
          bottomChrome -
          PHONE_CARD_GAP -
          (collapsedCardH ?? PHONE_CARD_ESTIMATE) -
          PHONE_MARKER_CLEARANCE;

    // Dense Route Generation & Equal Screen Arc-Length Placement
    const routeData = useMemo(() => {
        const SAMPLE_COUNT = 300;
        const EDGE_MARGIN = 32; // keep markers (44px hit target) fully on screen
        const sampleRoute = (amp: number) => {
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i <= SAMPLE_COUNT; i++) {
                const { x: gx, z: gz } = getRouteGroundPosition(i / SAMPLE_COUNT, amp, 2.5);
                pts.push(projectToScreen(gx, gz));
            }
            return pts;
        };
        const fitsOnScreen = (pts: { x: number; y: number }[]) =>
            pts.every((p) => p.x >= EDGE_MARGIN && p.x <= viewport.w - EDGE_MARGIN);

        // Start from the full weave (26 m) and narrow it until the route stays on screen;
        // in the phone end-stand view the pitch width is wider than the screen.
        let amp = 26;
        let samples = sampleRoute(amp);
        while (!fitsOnScreen(samples) && amp > 4) {
            amp -= 2;
            samples = sampleRoute(amp);
        }

        const cumDist = [0];
        for (let i = 1; i <= SAMPLE_COUNT; i++) {
            const step = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
            cumDist.push(cumDist[i - 1] + step);
        }

        const totalCurveLength = cumDist[SAMPLE_COUNT];

        // Phones: the route still starts at our posts, but milestones are placed only on the part
        // of the route above the phase card (screen y falls steadily from our posts to the far posts).
        // Markers are never placed under the card.
        let firstIdx = 0;
        if (phoneSafeBottom !== null) {
            const idx = samples.findIndex((s) => s.y <= phoneSafeBottom);
            if (idx >= 0) {
                firstIdx = idx;
            }
        }
        const startDist = cumDist[firstIdx];
        const usableLength = Math.max(1, totalCurveLength - startDist);

        // Place milestones at equal cumulative screen arc-length intervals
        // m=0 at start post (try line centre 10, 35) unless trimmed above the phone card,
        // m=count-1 at goal post (far try line centre 110, 35)
        let milestonePoints: { x: number; y: number; sampleIndex: number }[] = [];
        for (let m = 0; m < milestoneCount; m++) {
            const targetDist = startDist + (m / Math.max(1, milestoneCount - 1)) * usableLength;

            let idx = firstIdx;
            while (idx < SAMPLE_COUNT && cumDist[idx + 1] < targetDist) {
                idx++;
            }

            const s0 = samples[idx];
            const s1 = samples[Math.min(SAMPLE_COUNT, idx + 1)];
            const span = cumDist[idx + 1] - cumDist[idx];
            const frac = span > 0.0001 ? (targetDist - cumDist[idx]) / span : 0;

            milestonePoints.push({
                x: s0.x + (s1.x - s0.x) * frac,
                y: s0.y + (s1.y - s0.y) * frac,
                sampleIndex: idx,
            });
        }

        // Phones: equal arc length can put the markers either side of a weave turn almost on top
        // of each other (the route above the card is short). If any two are closer than one hit
        // target, use the largest straight-line gap that still fits them all: each marker sits at
        // the first sample at least that far from every earlier one, the last on the far posts.
        const closestPair = (pts: { x: number; y: number }[]) => {
            let min = Infinity;
            for (let a = 0; a < pts.length; a++) {
                for (let b = a + 1; b < pts.length; b++) {
                    min = Math.min(min, Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y));
                }
            }
            return min;
        };
        const placeByGap = (gap: number) => {
            const picked = [firstIdx];
            const clear = (i: number) =>
                picked.every((p) => Math.hypot(samples[i].x - samples[p].x, samples[i].y - samples[p].y) >= gap);
            let i = firstIdx;
            while (picked.length < milestoneCount - 1) {
                while (i < SAMPLE_COUNT && !clear(i)) i++;
                if (i >= SAMPLE_COUNT) return null;
                picked.push(i);
            }
            if (!clear(SAMPLE_COUNT)) return null;
            picked.push(SAMPLE_COUNT);
            return picked;
        };
        const arcGap = closestPair(milestonePoints);
        if (phoneSafeBottom !== null && milestoneCount > 2 && arcGap < MARKER_HIT_TARGET) {
            let lo = arcGap;
            let hi = MARKER_HIT_TARGET;
            let best: number[] | null = null;
            for (let step = 0; step < 12; step++) {
                const mid = (lo + hi) / 2;
                const picked = placeByGap(mid);
                if (picked) {
                    lo = mid;
                    best = picked;
                } else {
                    hi = mid;
                }
            }
            if (best) {
                milestonePoints = best.map((idx) => ({ x: samples[idx].x, y: samples[idx].y, sampleIndex: idx }));
            }
        }

        const startPost = samples[0];
        const goalPost = samples[SAMPLE_COUNT];

        // SVG Path String
        let pathD = `M ${startPost.x.toFixed(1)} ${startPost.y.toFixed(1)}`;
        for (let i = 0; i <= SAMPLE_COUNT; i++) {
            const s = samples[i];
            pathD += ` L ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
        }

        // Compute route bounding box (for band calculations)
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const s of samples) {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;
        }

        return {
            samples,
            milestonePoints,
            startPost,
            goalPost,
            pathD,
            bbox: { minX, maxX, minY, maxY },
        };
    }, [milestoneCount, projectToScreen, viewport.w, phoneSafeBottom]);

    const coords = routeData.milestonePoints;
    const startPost = routeData.startPost;
    const goalPost = routeData.goalPost;

    // Segmented paths for route styling
    const pathSegments = useMemo(() => {
        const segments: { path: string; fromIdx: number; toIdx: number }[] = [];
        if (coords.length === 0) return segments;

        // Phones: lead-in from our posts to the first milestone when the milestones were
        // trimmed above the phase card (drawn as completed route; it runs behind the card)
        if (coords[0].sampleIndex > 0) {
            const lead = routeData.startPost;
            let dLead = `M ${lead.x.toFixed(1)} ${lead.y.toFixed(1)}`;
            for (let i = 1; i <= coords[0].sampleIndex; i++) {
                const s = routeData.samples[i];
                dLead += ` L ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
            }
            dLead += ` L ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
            segments.push({ path: dLead, fromIdx: -1, toIdx: 0 });
        }

        // Consecutive milestones
        for (let m = 0; m < coords.length - 1; m++) {
            const mFrom = coords[m];
            const mTo = coords[m + 1];
            let dSeg = `M ${mFrom.x.toFixed(1)} ${mFrom.y.toFixed(1)}`;
            for (let i = mFrom.sampleIndex + 1; i <= mTo.sampleIndex; i++) {
                const s = routeData.samples[i];
                dSeg += ` L ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
            }
            segments.push({ path: dSeg, fromIdx: m, toIdx: m + 1 });
        }

        return segments;
    }, [coords, routeData]);

    // 5. Hero Free Bands & Phase Card Layout
    // Band A: between bottom of header/switch block and top of route
    // Band B: between bottom of route and bottom of hero (minus bottom chrome)
    const bandA = useMemo(() => {
        const top = headerBlockBottom + 12;
        // The goal label pill sits ~24-28px above the far posts; keep the card clear of it too
        const bottom = Math.min(routeData.bbox.minY, routeData.goalPost.y - (isDesktop ? 28 : 24) - 14) - 16;
        const height = Math.max(0, bottom - top);
        return { top, bottom, height, centerY: top + height / 2 };
    }, [headerBlockBottom, routeData.bbox.minY, routeData.goalPost.y, isDesktop]);

    const bandB = useMemo(() => {
        const top = routeData.bbox.maxY + 24;
        const bottom = viewport.h - bottomChrome - 16;
        const height = Math.max(0, bottom - top);
        return { top, bottom, height, centerY: top + height / 2 };
    }, [routeData.bbox.maxY, viewport.h, bottomChrome]);

    // Pick larger band: Desktop is Band B (bottom); Phone is Band A (top)
    const chosenBand = useMemo(() => {
        if (bandB.height >= bandA.height) {
            return { type: 'B' as const, ...bandB };
        }
        return { type: 'A' as const, ...bandA };
    }, [bandA, bandB]);

    // Card variant. Desktop: standard / compact by band clearance, or below-hero when tight.
    // Phones: always the bottom-anchored card ('phone'), never below-hero.
    const cardVariant = useMemo(() => {
        if (!isDesktop) return 'phone';
        if (chosenBand.height >= 180) return 'standard';
        if (chosenBand.height >= 56) return 'compact';
        return 'below-hero';
    }, [chosenBand.height, isDesktop]);

    // Measure the collapsed phone card (before paint, and whenever its content or width changes)
    useLayoutEffect(() => {
        const el = phoneCardRef.current;
        if (!el || cardVariant !== 'phone') return;
        const measure = () => {
            if (el.dataset.expanded === 'true') return;
            const h = Math.ceil(el.getBoundingClientRect().height);
            if (h > 0) setCollapsedCardH((prev) => (prev === h ? prev : h));
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [cardVariant, selectedMilestone.id, lang]);

    // Nothing is shown until the header block, bottom chrome and (phones) card height are known,
    // so the card never flashes in a provisional spot (e.g. above the header).
    const isPositioned =
        isHeaderMeasured &&
        isBottomChromeMeasured &&
        (isDesktop || collapsedCardH !== null);
    const isShown = visible && isPositioned;

    // Notify parent if below-hero fallback is required (desktop only)
    useEffect(() => {
        if (!isPositioned) return;
        onFallbackCardNeeded?.(isDesktop && cardVariant === 'below-hero');
    }, [cardVariant, isDesktop, isPositioned, onFallbackCardNeeded]);

    // Card expansion ("Read more" / "Show less")
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const descRef = useRef<HTMLParagraphElement>(null);

    // Collapse card automatically when milestone changes
    useEffect(() => {
        setIsExpanded(false);
    }, [selectedMilestone.id]);

    // Collapse card automatically when the user scrolls the hero / page
    useEffect(() => {
        const handleScroll = (e: Event) => {
            // Ignore scroll events originating from within the expanded card's scrollable container
            if (e.target && (e.target as HTMLElement).closest?.('.overflow-y-auto')) {
                return;
            }
            setIsExpanded(false);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Measure whether 3-line clamp actually hides text (scrollHeight > clientHeight after render and on resize)
    const checkOverflow = useCallback(() => {
        const el = descRef.current;
        if (!el) return;
        if (!isExpanded) {
            // While clamped with line-clamp-3, scrollHeight > clientHeight directly indicates hidden text
            setHasOverflow(el.scrollHeight > el.clientHeight + 1);
        } else {
            // While expanded, line-clamp is removed; verify against 3-line height so toggle button remains visible
            const computed = window.getComputedStyle(el);
            const lh = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5;
            setHasOverflow(el.scrollHeight > lh * 3 + 4);
        }
    }, [isExpanded]);

    // Check overflow on render and when milestone/language changes
    useLayoutEffect(() => {
        checkOverflow();
    }, [selectedMilestone.id, selectedMilestone.text, lang, checkOverflow]);

    // Recheck overflow on window resize and container resize
    useEffect(() => {
        window.addEventListener('resize', checkOverflow);
        const el = descRef.current;
        let ro: ResizeObserver | null = null;
        if (el && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(checkOverflow);
            ro.observe(el);
        }
        return () => {
            window.removeEventListener('resize', checkOverflow);
            ro?.disconnect();
        };
    }, [checkOverflow]);

    // 6. Reduced Motion Check
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // 7. Rugby Ball Travel along Route
    const [travel, setTravel] = useState(1);
    useEffect(() => {
        if (prefersReducedMotion) {
            setTravel(1);
            return;
        }
        let frame = 0;
        const start = performance.now();
        const duration = 1200;
        const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setTravel(1 - Math.pow(1 - p, 3));
            if (p < 1) frame = requestAnimationFrame(step);
        };
        setTravel(0);
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [journey.id, prefersReducedMotion]);

    const restPos = useMemo(() => {
        return coords[currentMilestoneIndex] || { x: viewport.w / 2, y: viewport.h / 2 };
    }, [coords, currentMilestoneIndex, viewport.w, viewport.h]);

    const ballPos = useMemo(() => {
        if (travel >= 1) return restPos;
        const targetSampleIndex = coords[currentMilestoneIndex]?.sampleIndex ?? 0;
        if (targetSampleIndex <= 0) return restPos;

        const floatIndex = travel * targetSampleIndex;
        const baseIndex = Math.floor(floatIndex);
        const frac = floatIndex - baseIndex;

        const s0 = routeData.samples[baseIndex];
        const s1 = routeData.samples[Math.min(targetSampleIndex, baseIndex + 1)];
        if (!s0 || !s1) return restPos;

        return {
            x: s0.x + (s1.x - s0.x) * frac,
            y: s0.y + (s1.y - s0.y) * frac,
        };
    }, [travel, restPos, coords, currentMilestoneIndex, routeData]);

    const ballRotation = useMemo(() => {
        if (activeHoverIndex === null || activeHoverIndex === currentMilestoneIndex || prefersReducedMotion) {
            return 0;
        }
        const target = coords[activeHoverIndex];
        if (!target) return 0;
        const dx = target.x - ballPos.x;
        const dy = target.y - ballPos.y;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (isDesktop) {
            if (deg > 180) deg -= 360;
            return Math.max(-15, Math.min(15, deg));
        } else {
            deg -= 90;
            if (deg > 180) deg -= 360;
            if (deg < -180) deg += 360;
            return Math.max(-15, Math.min(15, deg));
        }
    }, [activeHoverIndex, currentMilestoneIndex, coords, ballPos, prefersReducedMotion, isDesktop]);

    // 8. Keyboard Navigation (Route order)
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let nextIndex = index;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = Math.min(milestones.length - 1, index + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = Math.max(0, index - 1);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(false);
            onSelectMilestone(milestones[index]);
            return;
        } else if (e.key === 'Home') {
            e.preventDefault();
            nextIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            nextIndex = milestones.length - 1;
        }

        if (nextIndex !== index) {
            setIsExpanded(false);
            const nextMilestone = milestones[nextIndex];
            onSelectMilestone(nextMilestone);
            setFocusedMilestoneId(nextMilestone.id);
            const btn = document.getElementById(`milestone-btn-${nextMilestone.id}`);
            btn?.focus();
        }
    };

    // 9. Goal & Start Post Labels
    const startText = t('field.startPosts');
    const goalText = t('field.goalPosts', { goal: journey.goal[lang] });

    const goalPillY = Math.max(headerBlockBottom + 16, goalPost.y - (isDesktop ? 28 : 24));
    const startPillY = startPost.y + (isDesktop ? 26 : 28);
    // Phones: when milestones were trimmed above the phase card, our posts sit behind the card /
    // tab bar, so their label would only show through the glass; leave it out.
    const showStartPill = (coords[0]?.sampleIndex ?? 0) === 0;

    // Active single label positioning calculation
    const activeCoord = coords[activeLabelIndex] || { x: viewport.w / 2, y: viewport.h / 2 };
    const activeMilestone = milestones[activeLabelIndex] || selectedMilestone;

    // Determine whether label goes above or below to avoid phase card & screen bounds
    const isLabelAbove = useMemo(() => {
        if (!isDesktop) {
            // Phones: the card is below every marker, so the label goes above unless it would
            // run into the title/switch block (label is ~40px tall, centred 38px from the marker)
            return activeCoord.y - 38 - 22 > headerBlockBottom + 4;
        }
        if (chosenBand.type === 'A') {
            // Card is above route; place label below if marker is in upper third
            return activeCoord.y > chosenBand.bottom + 60;
        } else {
            // Card is below route; place label above if marker is in lower third
            return activeCoord.y > viewport.h - 120 ? true : activeCoord.y > 100;
        }
    }, [isDesktop, headerBlockBottom, chosenBand, activeCoord.y, viewport.h]);

    const labelX = Math.max(140, Math.min(viewport.w - 140, activeCoord.x));
    const labelY = isLabelAbove ? activeCoord.y - 38 : activeCoord.y + 38;

    return (
        <div
            aria-hidden={!isShown}
            className={clsx(
                'fixed inset-0 z-10 pointer-events-none select-none transition-opacity duration-200',
                isShown ? 'opacity-100' : 'opacity-0'
            )}
        >
            {/* SVG Layer for Dashed Route & Post Indicators */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ width: viewport.w, height: viewport.h }}
            >
                <defs>
                    <radialGradient id={`current-pulse-${animId}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#C1121F" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#C1121F" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Weaving Route Segments */}
                <g className="route-segments">
                    {pathSegments.map((seg, idx) => {
                        const isDone = seg.toIdx <= currentMilestoneIndex;
                        const isHighlighted =
                            activeHoverIndex !== null &&
                            activeHoverIndex !== currentMilestoneIndex &&
                            seg.fromIdx >= Math.min(currentMilestoneIndex, activeHoverIndex) &&
                            seg.toIdx <= Math.max(currentMilestoneIndex, activeHoverIndex);

                        return (
                            <path
                                key={idx}
                                d={seg.path}
                                fill="none"
                                stroke={
                                    isHighlighted
                                        ? '#0047AB'
                                        : isDone
                                          ? 'rgb(var(--brand))'
                                          : 'rgb(var(--brand))'
                                }
                                strokeWidth={isHighlighted ? 4 : isDone ? 3 : 2}
                                strokeDasharray={isHighlighted ? undefined : isDone ? undefined : '6 6'}
                                opacity={isHighlighted ? 1 : isDone ? 0.75 : 0.3}
                                strokeLinecap="round"
                                className="motion-safe:transition-all motion-safe:duration-200"
                            />
                        );
                    })}
                </g>

                {/* Ground Dots at Uprights */}
                <circle cx={startPost.x} cy={startPost.y} r="4" fill="rgb(var(--brand))" opacity="0.85" />
                <circle cx={goalPost.x} cy={goalPost.y} r="4" fill="rgb(var(--brand))" opacity="0.85" />
            </svg>

            {/* Start Post Label Pill */}
            {showStartPill && (
                <div
                    style={{
                        left: `${startPost.x}px`,
                        top: `${startPillY}px`,
                        transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute pointer-events-none px-2.5 py-1 rounded-full bg-navy/90 dark:bg-navy-tint/90 text-white dark:text-black text-[11px] font-bold uppercase tracking-wider shadow-sm whitespace-nowrap"
                >
                    {startText}
                </div>
            )}

            {/* Goal Post Label Pill */}
            <div
                style={{
                    left: `${goalPost.x}px`,
                    top: `${goalPillY}px`,
                    transform: 'translate(-50%, -50%)',
                }}
                className="absolute pointer-events-none max-w-[280px] sm:max-w-md px-3 py-1 rounded-full bg-navy/90 dark:bg-navy-tint/90 text-white dark:text-black text-xs font-bold tracking-tight shadow-sm whitespace-nowrap truncate"
            >
                {goalText}
            </div>

            {/* Milestone Markers */}
            {milestones.map((milestone, idx) => {
                const pos = coords[idx];
                if (!pos) return null;

                const isSelected = selectedMilestone.id === milestone.id;
                const isHovered = focusedMilestoneId === milestone.id;
                const isCurrent = milestone.status === 'current';
                const isDone = milestone.status === 'done';

                return (
                    <div
                        key={milestone.id}
                        style={{
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        className="absolute"
                    >
                        {/* LIVE Ping ring */}
                        {isCurrent && (
                            <div
                                aria-hidden="true"
                                className="absolute -inset-2 rounded-full bg-crimson/30 motion-safe:animate-ping pointer-events-none"
                            />
                        )}

                        {/* Active focus / selection ring */}
                        {(isSelected || isHovered) && (
                            <div
                                aria-hidden="true"
                                className={clsx(
                                    'absolute -inset-1 rounded-full pointer-events-none border-2 border-navy dark:border-navy-tint',
                                    isSelected ? 'border-solid' : 'border-dashed'
                                )}
                            />
                        )}

                        {/* Native Button Marker (>= 44px hit target) */}
                        <button
                            id={`milestone-btn-${milestone.id}`}
                            type="button"
                            aria-label={`${milestone.setPiece} · ${milestone.date} · ${milestone.title[lang]}`}
                            aria-pressed={isSelected}
                            onClick={() => {
                                setIsExpanded(false);
                                onSelectMilestone(milestone);
                            }}
                            onPointerEnter={() => hoverMilestone(milestone.id)}
                            onPointerLeave={() => hoverMilestone(null)}
                            onFocus={() => setFocusedMilestoneId(milestone.id)}
                            onBlur={() => setFocusedMilestoneId(null)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            tabIndex={visible ? 0 : -1}
                            className={clsx(
                                'relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full pointer-events-auto transition-transform active:scale-95',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint focus-visible:ring-offset-2',
                                isCurrent && 'text-white',
                                isDone && !isCurrent && 'text-white dark:text-black',
                                !isDone && !isCurrent && 'text-navy dark:text-navy-tint'
                            )}
                        >
                            <span
                                className={clsx(
                                    'w-8 h-8 rounded-full flex items-center justify-center shadow-md',
                                    isCurrent && 'bg-crimson',
                                    isDone && !isCurrent && 'bg-navy dark:bg-navy-tint',
                                    !isDone &&
                                        !isCurrent &&
                                        'bg-surface-sunken border-2 border-dashed border-navy/50 dark:border-navy-tint/50',
                                    isHovered && !isCurrent && isDone && 'brightness-110'
                                )}
                            >
                                <SetPieceIcon piece={milestone.setPiece} width={16} height={16} />
                            </span>
                        </button>
                    </div>
                );
            })}

            {/* Exactly ONE Label Pill (Hovered/Focused else Selected, never two!) */}
            <div
                style={{
                    left: `${labelX}px`,
                    top: `${labelY}px`,
                    transform: 'translate(-50%, -50%)',
                }}
                className="absolute pointer-events-none max-w-[260px] px-3 py-1.5 rounded-xl bg-deep-navy/95 border border-white/20 text-white shadow-xl z-20 text-center"
            >
                {isDesktop ? (
                    <p className="text-xs font-semibold leading-snug line-clamp-2">
                        <span className="text-navy-tint font-bold mr-1">{activeMilestone.date} ·</span>
                        <span>{activeMilestone.title[lang]}</span>
                    </p>
                ) : (
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-navy-tint tracking-tight uppercase">
                            {activeMilestone.date}
                        </p>
                        <p className="text-xs font-medium leading-tight text-white line-clamp-2">
                            {activeMilestone.title[lang]}
                        </p>
                    </div>
                )}
            </div>

            {/* Traveling Rugby Ball */}
            <div
                style={{
                    left: `${ballPos.x}px`,
                    top: `${ballPos.y}px`,
                    transform: `translate(-50%, -50%) rotate(${ballRotation.toFixed(1)}deg)`,
                }}
                className={clsx(
                    'absolute pointer-events-none',
                    !prefersReducedMotion && 'motion-safe:transition-transform motion-safe:duration-150 ease-out'
                )}
                role="img"
                aria-label={t('field.ballAria', {
                    title: milestones[currentMilestoneIndex]?.title[lang] || '',
                })}
            >
                <div className="relative -translate-y-4">
                    <RugbyBallSVG width={30} height={19} className="drop-shadow-lg" />
                </div>
            </div>

            {/* Phase Card Inside the Hero (Standard or Compact) */}
            {cardVariant !== 'below-hero' && (
                <div
                    aria-live="polite"
                    style={
                        isDesktop
                            ? isExpanded
                                ? chosenBand.type === 'A'
                                    ? { left: '50%', top: `${chosenBand.top}px`, transform: 'translateX(-50%)' }
                                    : { left: '50%', top: `${chosenBand.bottom}px`, transform: 'translate(-50%, -100%)' }
                                : { left: '50%', top: `${chosenBand.centerY}px`, transform: 'translate(-50%, -50%)' }
                            : {
                                  left: '50%',
                                  bottom: 'calc(var(--journey-bottom-chrome) + 12px)',
                                  transform: 'translateX(-50%)',
                              }
                    }
                    className={clsx(
                        'absolute pointer-events-auto z-30 transition-all duration-200',
                        isDesktop ? 'w-full max-w-[720px]' : 'w-[calc(100%-32px)] max-w-lg'
                    )}
                >
                    {isDesktop && cardVariant === 'compact' && !isExpanded ? (
                        /* Desktop compact 1-line form when space is tight */
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            aria-expanded={false}
                            className="w-full text-left glass-card-surface rounded-full px-4 py-2.5 min-h-[44px] shadow-md flex items-center justify-between gap-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-navy/10 dark:bg-navy-tint/20 text-navy dark:text-navy-tint flex items-center justify-center shrink-0">
                                    <SetPieceIcon piece={selectedMilestone.setPiece} width={12} height={12} />
                                </span>
                                <span className="font-semibold text-navy dark:text-navy-tint shrink-0">
                                    {selectedMilestone.date}
                                </span>
                                <span className="text-black/80 dark:text-white/80 font-medium truncate">
                                    {selectedMilestone.title[lang]}
                                </span>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-navy dark:text-navy-tint">
                                {selectedMilestone.status === 'current'
                                    ? 'LIVE'
                                    : selectedMilestone.status === 'done'
                                      ? t('status.done')
                                      : t('status.upcoming')}
                            </span>
                        </button>
                    ) : (
                        <div
                            ref={!isDesktop ? phoneCardRef : undefined}
                            data-expanded={isExpanded ? 'true' : 'false'}
                            className={clsx(
                                'rounded-2xl border transition-all duration-200',
                                isDesktop ? 'p-5' : isExpanded ? 'p-4' : 'px-3.5 py-2.5',
                                isExpanded
                                    ? 'bg-white/98 dark:bg-deep-navy/98 backdrop-blur-xl shadow-2xl border-line-subtle ring-1 ring-black/10 dark:ring-white/10 max-h-[50vh] overflow-y-auto'
                                    : 'glass-card-surface shadow-lg text-content-primary'
                            )}
                        >
                            <div className={clsx('flex items-center justify-between gap-3 border-b border-line-subtle/80', isDesktop ? 'pb-3' : isExpanded ? 'pb-2.5' : 'pb-1.5')}>
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <span
                                        className={clsx(
                                            'rounded-full flex items-center justify-center text-xs shadow-sm shrink-0',
                                            isDesktop || isExpanded ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-7 h-7',
                                            selectedMilestone.status === 'current' && 'bg-crimson text-white',
                                            selectedMilestone.status === 'done' &&
                                                'bg-navy dark:bg-navy-tint text-white dark:text-black',
                                            selectedMilestone.status === 'next' &&
                                                'bg-surface-sunken text-black/72 dark:text-white/72 border border-line-subtle'
                                        )}
                                    >
                                        <SetPieceIcon piece={selectedMilestone.setPiece} width={isDesktop || isExpanded ? 16 : 14} height={isDesktop || isExpanded ? 16 : 14} />
                                    </span>
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 block leading-tight">
                                            {selectedMilestone.setPiece}
                                        </span>
                                        <span className="text-xs font-semibold text-navy dark:text-navy-tint leading-tight">
                                            {selectedMilestone.date}
                                        </span>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div>
                                    {selectedMilestone.status === 'current' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-crimson text-white uppercase tracking-wider">
                                            <span
                                                className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse"
                                                aria-hidden="true"
                                            />
                                            {t('common:status.live')}
                                        </span>
                                    )}
                                    {selectedMilestone.status === 'done' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy dark:text-navy-tint">
                                            <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                                            {t('status.done')}
                                        </span>
                                    )}
                                    {selectedMilestone.status === 'next' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/60 dark:text-white/60">
                                            <Clock weight="duotone" className="w-3.5 h-3.5" />
                                            {t('status.upcoming')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={clsx('space-y-1', isDesktop ? 'pt-3' : isExpanded ? 'pt-2.5' : 'pt-1.5')}>
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className={clsx('font-bold text-black dark:text-white tracking-tight', isDesktop ? 'text-lg' : 'text-xs sm:text-sm truncate')}>
                                        {selectedMilestone.title[lang]}
                                    </h3>
                                    {!isDesktop && !isExpanded && (
                                        <button
                                            type="button"
                                            onClick={() => setIsExpanded(true)}
                                            className="shrink-0 text-xs font-bold text-navy dark:text-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy px-1 min-h-[44px] -my-3 flex items-center"
                                        >
                                            {t('card.readMore')}
                                        </button>
                                    )}
                                </div>
                                {(isDesktop || isExpanded) && (
                                    <>
                                        <p
                                            ref={descRef}
                                            className={clsx(
                                                'text-xs sm:text-sm text-black/85 dark:text-white/85 leading-relaxed',
                                                !isExpanded && (isDesktop ? 'line-clamp-3' : 'line-clamp-2')
                                            )}
                                        >
                                            {selectedMilestone.text[lang]}
                                        </p>

                                        {(hasOverflow || isExpanded) && (
                                            <button
                                                type="button"
                                                onClick={() => setIsExpanded((prev) => !prev)}
                                                className="inline-flex items-center text-xs font-bold text-navy dark:text-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy pt-1"
                                            >
                                                {isExpanded ? t('card.showLess') : t('card.readMore')}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
