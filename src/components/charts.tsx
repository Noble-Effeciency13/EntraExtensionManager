import { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Tiny inline-SVG charts used by the Tools dashboards. Keeping these in-house
 * avoids pulling a multi-MB charting library for what amounts to a few donuts
 * and bar charts.
 */

const palette = [
  '#5B5FC7', // brand
  '#107C10', // success
  '#0078D4', // info
  '#D83B01', // warning
  '#6264A7',
  '#8378DE',
  '#3A96DD',
  '#C19C00',
  '#881798',
  '#498205',
];

export function chartColor(i: number): string {
  return palette[i % palette.length];
}

const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  title: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  big: {
    fontSize: '28px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: 1,
  },
  hint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  donutWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  donutSvg: { flex: '0 0 auto' },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: tokens.fontSizeBase200,
    minWidth: 0,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  swatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    flex: '0 0 auto',
  },
  legendLabel: {
    flex: '1 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  legendCount: {
    color: tokens.colorNeutralForeground3,
    marginLeft: '6px',
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 40px',
    gap: '8px',
    alignItems: 'center',
    fontSize: tokens.fontSizeBase200,
  },
  barTrack: {
    height: '12px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 200ms ease',
  },
  barLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  barCount: {
    textAlign: 'right',
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

interface CardProps {
  title: string;
  children: ReactNode;
  hint?: string;
}

export function ChartCard({ title, children, hint }: CardProps) {
  const s = useStyles();
  return (
    <div className={s.card}>
      <div className={s.title}>{title}</div>
      {children}
      {hint && <div className={s.hint}>{hint}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: ReactNode;
  hint?: string;
}

export function StatCard({ title, value, hint }: StatCardProps) {
  const s = useStyles();
  return (
    <div className={s.card}>
      <div className={s.title}>{title}</div>
      <div className={s.big}>{value}</div>
      {hint && <div className={s.hint}>{hint}</div>}
    </div>
  );
}

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DonutProps {
  data: DataPoint[];
  size?: number;
  thickness?: number;
}

export function Donut({ data, size = 120, thickness = 22 }: DonutProps) {
  const s = useStyles();
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = size / 2;
  const inner = radius - thickness;
  const cx = radius;
  const cy = radius;

  if (total === 0) {
    return (
      <div className={s.donutWrap}>
        <svg width={size} height={size} className={s.donutSvg}>
          <circle
            cx={cx}
            cy={cy}
            r={(radius + inner) / 2}
            fill="none"
            stroke={tokens.colorNeutralStroke2}
            strokeWidth={thickness}
            opacity={0.4}
          />
        </svg>
        <div className={s.empty}>No data yet.</div>
      </div>
    );
  }

  // Treat the chart as "single slice" if exactly one entry has non-zero
  // value -- SVG arcs collapse to a point when start === end, so we render
  // a stroked ring instead.
  const nonZero = data.filter((d) => d.value > 0);
  const singleSlice = nonZero.length === 1 ? nonZero[0] : null;
  const singleColor = singleSlice
    ? singleSlice.color ?? chartColor(data.indexOf(singleSlice))
    : null;

  let acc = 0;
  const arcs = singleSlice
    ? []
    : data.map((d, i) => {
        if (d.value === 0) {
          return { path: '', color: d.color ?? chartColor(i), label: d.label, value: d.value };
        }
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += d.value;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const color = d.color ?? chartColor(i);
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = cx + radius * Math.cos(start);
        const y1 = cy + radius * Math.sin(start);
        const x2 = cx + radius * Math.cos(end);
        const y2 = cy + radius * Math.sin(end);
        const x3 = cx + inner * Math.cos(end);
        const y3 = cy + inner * Math.sin(end);
        const x4 = cx + inner * Math.cos(start);
        const y4 = cy + inner * Math.sin(start);
        const path = [
          `M ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`,
          `L ${x3} ${y3}`,
          `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
          'Z',
        ].join(' ');
        return { path, color, label: d.label, value: d.value };
      });

  return (
    <div className={s.donutWrap}>
      <svg width={size} height={size} className={s.donutSvg}>
        {singleSlice ? (
          <circle
            cx={cx}
            cy={cy}
            r={(radius + inner) / 2}
            fill="none"
            stroke={singleColor!}
            strokeWidth={thickness}
          />
        ) : (
          arcs
            .filter((a) => a.path)
            .map((a, i) => <path key={i} d={a.path} fill={a.color} />)
        )}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={18}
          fontWeight={600}
          fill={tokens.colorNeutralForeground1}
        >
          {total}
        </text>
      </svg>
      <div className={s.legend}>
        {(singleSlice
          ? [{ color: singleColor!, label: singleSlice.label, value: singleSlice.value }]
          : arcs
        ).map((a, i) => (
          <div key={i} className={s.legendRow}>
            <span className={s.swatch} style={{ backgroundColor: a.color }} />
            <span className={s.legendLabel}>{a.label}</span>
            <span className={s.legendCount}>{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarsProps {
  data: DataPoint[];
  /** Maximum bars to render. Anything beyond is summarized. */
  maxRows?: number;
}

export function HorizontalBars({ data, maxRows = 8 }: BarsProps) {
  const s = useStyles();
  const sorted = data.slice().sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxRows);
  const rest = sorted.slice(maxRows);
  if (rest.length) {
    head.push({
      label: `Other (${rest.length})`,
      value: rest.reduce((acc, d) => acc + d.value, 0),
    });
  }
  const max = Math.max(1, ...head.map((d) => d.value));
  if (max === 0 || head.length === 0) {
    return <div className={s.empty}>No data yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {head.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={`${d.label}-${i}`} className={s.barRow}>
            <span className={s.barLabel} title={d.label}>
              {d.label}
            </span>
            <div className={s.barTrack}>
              <div
                className={s.barFill}
                style={{
                  width: `${pct}%`,
                  backgroundColor: d.color ?? chartColor(i),
                }}
              />
            </div>
            <span className={s.barCount}>{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}
