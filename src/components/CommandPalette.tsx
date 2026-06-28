import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogBody,
  DialogSurface,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n';

export interface Command {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  keywords?: string;
  run: () => void;
}

const useStyles = makeStyles({
  surface: {
    maxWidth: '560px',
    width: '560px',
    padding: 0,
    overflow: 'hidden',
  },
  body: { padding: 0 },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
  },
  input: {
    flex: '1 1 auto',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
    fontFamily: tokens.fontFamilyBase,
  },
  list: {
    maxHeight: 'min(50vh, 420px)',
    overflowY: 'auto',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: tokens.colorNeutralForeground1,
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase300,
    fontFamily: tokens.fontFamilyBase,
  },
  itemActive: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  icon: {
    display: 'flex',
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  label: { flex: '1 1 auto' },
  group: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * A keyboard-driven command palette (Ctrl/Cmd+K). Filters a flat list of
 * commands by label/group/keywords and runs the highlighted one on Enter.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
}) {
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.group ?? ''} ${c.keywords ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [open]);

  const run = (c: Command) => {
    onOpenChange(false);
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered[active];
      if (c) run(c);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface className={styles.surface} aria-label="Command palette">
        <DialogBody className={styles.body}>
          <div className={styles.searchRow}>
            <Search20Regular />
            <input
              ref={inputRef}
              className={styles.input}
              placeholder={t('commandPalette.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Search commands"
            />
          </div>
          <div className={styles.list} role="listbox" aria-label="Commands">
            {filtered.length === 0 && (
              <div className={styles.empty}>{t('commandPalette.empty')}</div>
            )}
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
              >
                {c.icon && <span className={styles.icon}>{c.icon}</span>}
                <span className={styles.label}>{c.label}</span>
                {c.group && <span className={styles.group}>{c.group}</span>}
              </button>
            ))}
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
