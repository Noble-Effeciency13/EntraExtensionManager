import { useEffect, useState } from 'react';
import {
  Button,
  Caption1,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useDryRunExtensionValue } from '@/api/dryRun';
import {
  useDirectoryObjectSearch,
  type DirectoryObjectResult,
} from '@/api/directoryObjects';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '520px' },
  result: {
    backgroundColor: 'var(--colorNeutralBackground3)',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'var(--fontFamilyMonospace)',
    fontSize: '12px',
    maxHeight: '220px',
    overflow: 'auto',
  },
  listbox: { maxHeight: 'min(40vh, 280px)', overflowY: 'auto' },
  optionLabel: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  optionSecondary: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: string;
  targetTypes: string[];
  /** When true the value is wrapped as an object payload (schema extensions). */
  isSchema: boolean;
  /** For schema extensions: pre-known property names so we can seed a payload. */
  propertyNames?: string[];
}

export function ValidateValueDialog({
  open,
  onOpenChange,
  attribute,
  targetTypes,
  isSchema,
  propertyNames,
}: Props) {
  const styles = useStyles();
  const dry = useDryRunExtensionValue();
  const toast = useAppToast();

  const [targetType, setTargetType] = useState(targetTypes[0] ?? 'User');
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState<DirectoryObjectResult | null>(null);
  const [targetId, setTargetId] = useState('');
  const [valueText, setValueText] = useState(
    isSchema
      ? JSON.stringify(
          Object.fromEntries((propertyNames ?? ['property1']).map((p) => [p, 'sample'])),
          null,
          2,
        )
      : 'sample-value',
  );
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    setSearchText('');
    setDebouncedQuery('');
    setSelectedObject(null);
    setTargetId('');
  }, [targetType]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchText), 300);
    return () => clearTimeout(h);
  }, [searchText]);

  const searchQ = useDirectoryObjectSearch(
    targetType as 'User' | 'Group' | 'Device' | 'Application' | 'AdministrativeUnit',
    debouncedQuery,
    true,
  );

  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const looksLikeGuid = GUID_RE.test(searchText.trim());
  const looksLikeUpn =
    targetType === 'User' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchText.trim());
  const canUseDirect = looksLikeGuid || looksLikeUpn;

  const commitOption = (optionValue?: string) => {
    if (!optionValue || optionValue.startsWith('__hint')) return;
    if (optionValue.startsWith('__direct:')) {
      const id = optionValue.slice('__direct:'.length).trim();
      setSelectedObject({ id, displayName: id });
      setSearchText(id);
      setTargetId(id);
      return;
    }
    const match = searchQ.data?.find((r) => r.id === optionValue);
    if (match) {
      setSelectedObject(match);
      setSearchText(match.displayName);
      setTargetId(match.id);
    }
  };

  const run = async () => {
    setOutput(null);
    let parsedValue: unknown = valueText;
    if (isSchema) {
      try {
        parsedValue = JSON.parse(valueText);
      } catch (e) {
        toast.error('Invalid JSON value', e);
        return;
      }
    }
    try {
      const res = await dry.mutateAsync({
        targetType,
        targetId: targetId.trim(),
        attribute,
        value: parsedValue,
      });
      setOutput(JSON.stringify(res, null, 2));
      toast.success(
        res.cleanedUp ? 'Write + cleanup OK' : 'Write OK, cleanup failed',
        `${attribute} on ${targetType}/${targetId.trim()}`,
      );
    } catch (e) {
      setOutput(
        JSON.stringify(
          { error: (e as Error).message, raw: String(e) },
          null,
          2,
        ),
      );
      toast.error('Dry-run failed', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Validate value</DialogTitle>
          <DialogContent className={styles.body}>
            <MessageBar intent="warning" layout="multiline">
              <MessageBarBody>
                This will PATCH a real resource with the value, read it back,
                then PATCH the attribute to <code>null</code> to clean up.
                Requires Edit mode and a target resource you own / can modify.
              </MessageBarBody>
            </MessageBar>

            <Field label="Target type">
              <Dropdown
                value={targetType}
                selectedOptions={[targetType]}
                onOptionSelect={(_, d) =>
                  setTargetType(d.optionValue ?? targetType)
                }
              >
                {targetTypes.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field
              label="Target object"
              hint={
                targetType === 'User'
                  ? 'Search by name or UPN, or paste an object id'
                  : 'Search by name, or paste an object id'
              }
            >
              <Combobox
                placeholder={
                  targetType === 'User'
                    ? 'Type name, UPN, or paste a GUID…'
                    : 'Type name or paste a GUID…'
                }
                value={selectedObject ? selectedObject.displayName : searchText}
                selectedOptions={selectedObject ? [selectedObject.id] : []}
                onInput={(e) => {
                  setSearchText((e.target as HTMLInputElement).value);
                  if (selectedObject) {
                    setSelectedObject(null);
                    setTargetId('');
                  }
                }}
                onOptionSelect={(_, d) => commitOption(d.optionValue)}
                positioning={{ autoSize: 'height-always', position: 'below', align: 'start' }}
                listbox={{ className: styles.listbox }}
              >
                {canUseDirect && (
                  <Option value={`__direct:${searchText.trim()}`} text={searchText.trim()}>
                    Look up "{searchText.trim()}" directly
                  </Option>
                )}
                {searchQ.isFetching ? (
                  <Option value="__hint_loading" disabled text="Searching">
                    Searching…
                  </Option>
                ) : searchQ.error ? (
                  <Option value="__hint_error" disabled text="Error">
                    Search failed: {(searchQ.error as Error).message}
                  </Option>
                ) : debouncedQuery.trim().length < 2 ? (
                  <Option value="__hint_min" disabled text="Keep typing">
                    Type at least 2 characters to search…
                  </Option>
                ) : (searchQ.data?.length ?? 0) === 0 ? (
                  <Option value="__hint_empty" disabled text="No matches">
                    No matches
                  </Option>
                ) : (
                  searchQ.data!.map((r) => (
                    <Option key={r.id} value={r.id} text={r.displayName}>
                      <div className={styles.optionLabel}>
                        <span>{r.displayName}</span>
                        {r.secondary && (
                          <span className={styles.optionSecondary}>{r.secondary}</span>
                        )}
                      </div>
                    </Option>
                  ))
                )}
              </Combobox>
            </Field>

            <Field label={isSchema ? 'Value JSON' : 'Value'}>
              {isSchema ? (
                <Textarea
                  rows={6}
                  value={valueText}
                  onChange={(_, d) => setValueText(d.value)}
                />
              ) : (
                <Input
                  value={valueText}
                  onChange={(_, d) => setValueText(d.value)}
                />
              )}
            </Field>

            {output && (
              <div>
                <Caption1>Result</Caption1>
                <pre className={styles.result}>{output}</pre>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              appearance="primary"
              onClick={run}
              disabled={!targetId.trim() || dry.isPending}
              icon={dry.isPending ? <Spinner size="tiny" /> : undefined}
            >
              {dry.isPending ? 'Running…' : 'Run dry-run'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
