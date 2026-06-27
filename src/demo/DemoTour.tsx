import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useDemo } from './DemoContext';

/**
 * A guided walkthrough overlay shown inside the demo. It spotlights key parts
 * of the portal one at a time with an explanatory callout, and can always be
 * dismissed with the Skip button (or Esc). It auto-launches when entering demo
 * mode and can be replayed from the Help button in the top bar.
 *
 * Targets are located by `data-tour="<id>"` attributes on the relevant chrome.
 */
interface TourStep {
  title: string;
  body: string;
  /** `data-tour` value of the element to highlight, or null for a centered step. */
  target: string | null;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to the demo',
    body: 'This is a fully simulated tenant pre-loaded with sample extensions, usage and audit data. Explore everything freely — nothing here is ever sent to Microsoft Graph.',
    target: null,
  },
  {
    title: 'Browse & manage extensions',
    body: 'Use the navigation to work with Schema, Directory and Open extensions. The Tools section below adds an audit log, usage monitor, value validator and manifest snippet generator.',
    target: 'nav',
  },
  {
    title: 'Read & Edit modes',
    body: 'You start read-only. Switch to Edit to create, assign, update and delete — in the demo this is instant and never prompts for consent.',
    target: 'mode',
  },
  {
    title: 'Switch tenants',
    body: 'Hop between the simulated tenants here. With a real sign-in this lists every tenant your account can reach.',
    target: 'tenant',
  },
  {
    title: 'Make it yours',
    body: 'Restyle the whole portal with a skin — Fluent, Retro, 8-bit, Synthwave or Newsprint — each with its own look and feel.',
    target: 'skin',
  },
  {
    title: 'Light or dark',
    body: 'Flip between light and dark themes at any time. Your preference is remembered for next time.',
    target: 'theme',
  },
  {
    title: 'Your session',
    body: 'Open the account menu to review the demo identity and choose Exit demo to return to the sign-in screen.',
    target: 'account',
  },
  {
    title: "You're all set",
    body: 'That\u2019s the tour! Dive in and experiment. You can replay this walkthrough anytime from the Help (?) button in the top bar.',
    target: null,
  },
];

const CARD_WIDTH = 340;
const CARD_HEIGHT_ESTIMATE = 220;
const MARGIN = 12;
const SPOTLIGHT_PAD = 6;
const OVERLAY_Z = 99999;

const useStyles = makeStyles({
  blocker: {
    position: 'fixed',
    inset: 0,
    zIndex: OVERLAY_Z,
  },
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
  footerRight: {
    display: 'flex',
    gap: '8px',
  },
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

export function DemoTour() {
  const styles = useStyles();
  const { isDemo, tourNonce } = useDemo();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // (Re)launch whenever the demo context bumps the nonce.
  useEffect(() => {
    if (isDemo && tourNonce > 0) {
      setStepIndex(0);
      stepRef.current = 0;
      setOpen(true);
    }
  }, [tourNonce, isDemo]);

  const measure = useCallback(() => {
    const current = STEPS[stepRef.current];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardHeight = cardRef.current?.offsetHeight ?? CARD_HEIGHT_ESTIMATE;

    if (!current.target) {
      setLayout({
        centered: true,
        top: Math.max(MARGIN, (vh - cardHeight) / 2),
        left: Math.max(MARGIN, (vw - CARD_WIDTH) / 2),
      });
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${current.target}"]`,
    );
    if (!el) {
      setLayout({
        centered: true,
        top: Math.max(MARGIN, (vh - cardHeight) / 2),
        left: Math.max(MARGIN, (vw - CARD_WIDTH) / 2),
      });
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
  }, []);

  // Recompute placement on step change, open, and viewport changes.
  useEffect(() => {
    if (!open) return;
    stepRef.current = stepIndex;
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

  // Move keyboard focus to the callout for accessibility.
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, stepIndex]);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= STEPS.length - 1) {
        setOpen(false);
        return i;
      }
      return i + 1;
    });
  }, []);
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next, back]);

  if (!isDemo || !open || !layout) return null;

  return (
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
        tabIndex={-1}
      >
        <div className={styles.headerRow}>
          <Caption1 className={styles.counter}>
            Step {stepIndex + 1} of {STEPS.length}
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
            Skip
          </Button>
          <div className={styles.footerRight}>
            {stepIndex > 0 && (
              <Button appearance="secondary" onClick={back}>
                Back
              </Button>
            )}
            <Button appearance="primary" onClick={next}>
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
