import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Body1,
  Button,
  Caption1,
  Portal,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n';

export interface TourStep {
  title: string;
  body: string;
  /** `data-tour` value of the element to spotlight, or null for a centered step. */
  target: string | null;
}

interface TourContextValue {
  isOpen: boolean;
  /** Start a tour with an explicit set of steps. */
  start: (steps: TourStep[]) => void;
  /** Register (or clear) the current page's steps. Call from a page effect. */
  setPageSteps: (steps: TourStep[] | null) => void;
  /** Start the contextual tour: this page's steps (if any) then the chrome tour. */
  startPageTour: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const CARD_WIDTH = 340;
const CARD_HEIGHT_ESTIMATE = 220;
const MARGIN = 12;
const SPOTLIGHT_PAD = 6;
const OVERLAY_Z = 99999;

const useStyles = makeStyles({
  blocker: { position: 'fixed', inset: 0, zIndex: OVERLAY_Z },
  spotlight: {
    position: 'fixed',
    zIndex: OVERLAY_Z + 1,
    borderRadius: tokens.borderRadiusMedium,
    border: `2px solid ${tokens.colorBrandStroke1}`,
    boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
    pointerEvents: 'none',
    transitionProperty: 'top, left, width, height',
    transitionDuration: tokens.durationSlow,
    transitionTimingFunction: tokens.curveEasyEase,
  },
  card: {
    position: 'fixed',
    zIndex: OVERLAY_Z + 2,
    width: `${CARD_WIDTH}px`,
    maxWidth: 'calc(100vw - 24px)',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow64,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transitionProperty: 'top, left',
    transitionDuration: tokens.durationSlow,
    transitionTimingFunction: tokens.curveEasyEase,
    outlineStyle: 'none',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  counter: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  body: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '4px',
  },
  footerRight: { display: 'flex', gap: '8px' },
});

interface Layout {
  centered: boolean;
  rect?: { top: number; left: number; width: number; height: number };
  top: number;
  left: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function place(
  rect: DOMRect,
  cardHeight: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const fitsBelow = vh - rect.bottom >= cardHeight + MARGIN;
  const fitsRight = vw - rect.right >= CARD_WIDTH + MARGIN;
  const fitsAbove = rect.top >= cardHeight + MARGIN;
  const fitsLeft = rect.left >= CARD_WIDTH + MARGIN;
  let top: number;
  let left: number;
  if (fitsBelow) {
    top = rect.bottom + MARGIN;
    left = rect.left;
  } else if (fitsRight) {
    left = rect.right + MARGIN;
    top = rect.top;
  } else if (fitsAbove) {
    top = rect.top - MARGIN - cardHeight;
    left = rect.left;
  } else if (fitsLeft) {
    left = rect.left - MARGIN - CARD_WIDTH;
    top = rect.top;
  } else {
    top = rect.bottom + MARGIN;
    left = rect.left;
  }
  return {
    top: clamp(top, MARGIN, vh - cardHeight - MARGIN),
    left: clamp(left, MARGIN, vw - CARD_WIDTH - MARGIN),
  };
}

/**
 * Provides a reusable guided-tour engine: a dimmed overlay that spotlights one
 * element at a time with an explanatory callout. Any descendant can start the
 * contextual tour (page steps + chrome steps) or register page-specific steps.
 *
 * Accessibility: the callout is a focus-trapped dialog with an aria-live region
 * announcing each step; focus is restored to the trigger when the tour closes.
 */
export function TourProvider({
  children,
  chromeSteps,
}: {
  children: ReactNode;
  chromeSteps: TourStep[];
}) {
  const styles = useStyles();
  const pageStepsRef = useRef<TourStep[] | null>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepIndexRef = useRef(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const start = useCallback((next: TourStep[]) => {
    if (!next.length) return;
    lastFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSteps(next);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setOpen(true);
  }, []);

  const setPageSteps = useCallback((next: TourStep[] | null) => {
    pageStepsRef.current = next;
  }, []);

  const startPageTour = useCallback(() => {
    start([...(pageStepsRef.current ?? []), ...chromeSteps]);
  }, [start, chromeSteps]);

  const measure = useCallback(() => {
    const current = steps[stepIndexRef.current];
    if (!current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardHeight = cardRef.current?.offsetHeight ?? CARD_HEIGHT_ESTIMATE;
    const centeredLayout: Layout = {
      centered: true,
      top: Math.max(MARGIN, (vh - cardHeight) / 2),
      left: Math.max(MARGIN, (vw - CARD_WIDTH) / 2),
    };
    if (!current.target) {
      setLayout(centeredLayout);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${current.target}"]`,
    );
    if (!el) {
      setLayout(centeredLayout);
      return;
    }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const rect = el.getBoundingClientRect();
    const pos = place(rect, cardHeight, vw, vh);
    setLayout({
      centered: false,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      ...pos,
    });
  }, [steps]);

  useEffect(() => {
    if (!open) return;
    stepIndexRef.current = stepIndex;
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, stepIndex, measure]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, stepIndex]);

  const close = useCallback(() => {
    setOpen(false);
    lastFocusedRef.current?.focus?.();
  }, []);
  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        setOpen(false);
        lastFocusedRef.current?.focus?.();
        return i;
      }
      return i + 1;
    });
  }, [steps.length]);
  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.key === 'Tab') {
        // Focus trap: keep Tab within the callout's focusable controls.
        const card = cardRef.current;
        if (!card) return;
        const focusable = card.querySelectorAll<HTMLElement>(
          'button, [href], a',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === card)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close, next, back]);

  const value = useMemo<TourContextValue>(
    () => ({ isOpen: open, start, setPageSteps, startPageTour }),
    [open, start, setPageSteps, startPageTour],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {open && layout && step && (
        <Portal>
          <div
            className={styles.blocker}
            style={{
              background: layout.centered ? 'rgba(0, 0, 0, 0.55)' : 'transparent',
            }}
          />
          {!layout.centered && layout.rect && (
            <div
              className={styles.spotlight}
              style={{
                top: layout.rect.top - SPOTLIGHT_PAD,
                left: layout.rect.left - SPOTLIGHT_PAD,
                width: layout.rect.width + SPOTLIGHT_PAD * 2,
                height: layout.rect.height + SPOTLIGHT_PAD * 2,
              }}
            />
          )}
          <div
            ref={cardRef}
            className={styles.card}
            style={{ top: layout.top, left: layout.left }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="eem-tour-title"
            aria-live="polite"
            tabIndex={-1}
          >
            <div className={styles.headerRow}>
              <Caption1 className={styles.counter}>
                Step {stepIndex + 1} of {steps.length}
              </Caption1>
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss20Regular />}
                aria-label="Skip walkthrough"
                onClick={close}
              />
            </div>
            <Subtitle2 id="eem-tour-title">{step.title}</Subtitle2>
            <Body1 className={styles.body}>{step.body}</Body1>
            <div className={styles.footerRow}>
              <Button appearance="subtle" onClick={close}>
                {t('common.skip')}
              </Button>
              <div className={styles.footerRight}>
                {stepIndex > 0 && (
                  <Button appearance="secondary" onClick={back}>
                    {t('common.back')}
                  </Button>
                )}
                <Button appearance="primary" onClick={next}>
                  {isLast ? t('common.finish') : t('common.next')}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider.');
  return ctx;
}

/**
 * Register a page's tour steps for as long as the calling component is mounted.
 * The contextual tour (Help button) runs these first, then the chrome tour.
 */
export function usePageTour(steps: TourStep[]) {
  const { setPageSteps } = useTour();
  useEffect(() => {
    setPageSteps(steps);
    return () => setPageSteps(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
