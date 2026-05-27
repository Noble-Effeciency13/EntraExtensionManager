import { useMemo, useState } from 'react';
import {
  Combobox,
  Field,
  Option,
  makeStyles,
} from '@fluentui/react-components';
import { useAllApplications } from '@/api/applications';
import type { AppRegistration } from '@/types/extensions';

const useStyles = makeStyles({
  listbox: {
    maxHeight: 'min(40vh, 320px)',
    maxWidth: '520px',
    overflowY: 'auto',
  },
  optionLabel: { display: 'flex', flexDirection: 'column' },
  optionAppId: { fontSize: '11px', opacity: 0.7 },
});

interface Props {
  /** Field label, e.g. "Owning application" or "Owner appId". */
  label: string;
  /** Help text shown beneath the input. */
  hint?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Inline error message; renders the field in the error state. */
  errorMessage?: string;
  /** Whether the picker should fetch applications now. */
  enabled?: boolean;
  /** Optional placeholder; defaults to a search prompt. */
  placeholder?: string;
  /** Currently picked app (controlled). */
  value: AppRegistration | undefined;
  /** Fires when the user selects an app, or clears the picker. */
  onChange: (app: AppRegistration | undefined) => void;
}

/**
 * Reusable Combobox-backed application picker.
 * - Renders a normal anchored dropdown beneath the input.
 * - Caps the listbox at ~10 visible rows with an internal scrollbar.
 * - Filters by display name OR appId (substring, case-insensitive).
 */
export function AppPicker({
  label,
  hint,
  required,
  errorMessage,
  enabled = true,
  placeholder,
  value,
  onChange,
}: Props) {
  const styles = useStyles();
  const appsQuery = useAllApplications(enabled);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const apps = appsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    const matched = q
      ? apps.filter(
          (a) =>
            (a.displayName ?? '').toLowerCase().includes(q) ||
            a.appId.toLowerCase().includes(q),
        )
      : apps;
    // Render up to 200 matches; the listbox itself scrolls internally and is
    // height-capped so it never overflows the viewport.
    return { rows: matched.slice(0, 200), totalMatches: matched.length };
  }, [appsQuery.data, query]);

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      validationMessage={errorMessage}
      validationState={errorMessage ? 'error' : undefined}
    >
      <Combobox
        placeholder={
          placeholder ??
          (appsQuery.isLoading
            ? 'Loading applications…'
            : 'Type to search applications')
        }
        value={value?.displayName ?? query}
        selectedOptions={value ? [value.id] : []}
        positioning={{
          autoSize: 'height-always',
          position: 'below',
          align: 'start',
        }}
        listbox={{
          className: `eem-app-picker-listbox ${styles.listbox}`,
        }}
        onInput={(e) => {
          setQuery((e.target as HTMLInputElement).value);
          if (value) onChange(undefined);
        }}
        onOptionSelect={(_, d) => {
          const app = (appsQuery.data ?? []).find((a) => a.id === d.optionValue);
          if (app) {
            onChange(app);
            setQuery(app.displayName);
          }
        }}
      >
        {appsQuery.isLoading ? (
          <Option value="__loading" disabled text="Loading…">
            Loading applications…
          </Option>
        ) : filtered.rows.length === 0 ? (
          <Option value="__empty" disabled text="No matches">
            No applications match
          </Option>
        ) : (
          <>
            {filtered.rows.map((a) => (
              <Option key={a.id} value={a.id} text={a.displayName}>
                <div className={styles.optionLabel}>
                  <span>{a.displayName}</span>
                  <span className={styles.optionAppId}>{a.appId}</span>
                </div>
              </Option>
            ))}
            {filtered.totalMatches > filtered.rows.length && (
              <Option
                value="__more"
                disabled
                text={`+${filtered.totalMatches - filtered.rows.length} more — keep typing to narrow`}
              >
                +{filtered.totalMatches - filtered.rows.length} more — keep
                typing to narrow
              </Option>
            )}
          </>
        )}
      </Combobox>
    </Field>
  );
}
