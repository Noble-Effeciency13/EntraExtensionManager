import { useEffect, useState } from 'react';
import {
  Badge,
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
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Warning16Regular } from '@fluentui/react-icons';
import { useAssignExtensionValue } from '@/api/dryRun';
import {
  useDirectoryObjectSearch,
  type DirectoryObjectResult,
} from '@/api/directoryObjects';
import { useAppToast } from '@/hooks/useAppToast';
import type { DirectoryExtensionProperty } from '@/types/extensions';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '480px' },
  readBack: {
    padding: '12px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    maxHeight: '160px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
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
  warn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ext: DirectoryExtensionProperty;
}

export function AssignValueDialog({ open, onOpenChange, ext }: Props) {
  const styles = useStyles();
  const assign = useAssignExtensionValue();
  const toast = useAppToast();

  const [targetType, setTargetType] = useState(ext.targetObjects[0] ?? 'User');
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState<DirectoryObjectResult | null>(null);
  const [targetId, setTargetId] = useState('');
  const [value, setValue] = useState('');
  const [readBack, setReadBack] = useState<string | null>(null);

  const isOrg = targetType === 'Organization';

  // Reset search/selection when target type changes.
  useEffect(() => {
    setSearchText('');
    setDebouncedQuery('');
    setSelectedObject(null);
    setTargetId('');
  }, [targetType]);

  // Debounce — 300ms, same as OpenExtensionsPage.
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchText), 300);
    return () => clearTimeout(h);
  }, [searchText]);

  const searchQ = useDirectoryObjectSearch(
    targetType as 'User' | 'Group' | 'Device' | 'Application' | 'AdministrativeUnit',
    debouncedQuery,
    !isOrg,
  );

  const close = () => {
    onOpenChange(false);
    setSearchText('');
    setDebouncedQuery('');
    setSelectedObject(null);
    setTargetId('');
    setValue('');
    setReadBack(null);
  };

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
    setReadBack(null);
    const effectiveId = isOrg ? 'organization' : targetId.trim();
    const trimmedVal = value.trim();
    if (!effectiveId || !trimmedVal) return;

    // Coerce value to the correct primitive type.
    let coerced: unknown = trimmedVal;
    if (ext.dataType === 'Boolean') {
      coerced = trimmedVal.toLowerCase() === 'true';
    } else if (ext.dataType === 'Integer' || ext.dataType === 'LargeInteger') {
      const n = Number(trimmedVal);
      if (!Number.isFinite(n)) {
        toast.error('Invalid value', new Error(`"${trimmedVal}" is not a valid ${ext.dataType}.`));
        return;
      }
      coerced = n;
    }

    try {
      const res = await assign.mutateAsync({
        targetType,
        targetId: effectiveId,
        attribute: ext.name,
        value: coerced,
      });
      setReadBack(JSON.stringify(res.readBack, null, 2));
      toast.success('Value assigned', `${ext.name} on ${targetType}/${effectiveId}`);
    } catch (e) {
      toast.error('Assign failed', e);
    }
  };

  const shortName = ext.name.split('_').slice(2).join('_') || ext.name;

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) close(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            Assign value — <code>{shortName}</code>
          </DialogTitle>
          <DialogContent className={styles.body}>
            <Caption1>
              Writes a value for{' '}
              <code>{ext.name}</code> directly onto the chosen directory
              object. This is a real, persisted write — not a dry-run.
            </Caption1>

            <span className={styles.warn}>
              <Warning16Regular />
              Edit mode required. The value will remain on the object until you
              clear it.
            </span>

            <Field label="Target type">
              <Dropdown
                value={targetType}
                selectedOptions={[targetType]}
                onOptionSelect={(_, d) => setTargetType(d.optionValue ?? targetType)}
              >
                {ext.targetObjects.map((t) => (
                  <Option key={t} value={t}>{t}</Option>
                ))}
              </Dropdown>
            </Field>

            <Field
              label="Object"
              hint={
                isOrg
                  ? 'Organization is a singleton — it will be used automatically'
                  : targetType === 'User'
                    ? 'Search by name or UPN, or paste an object id'
                    : 'Search by name, or paste an object id'
              }
              required={!isOrg}
            >
              {isOrg ? (
                <Input readOnly value="Organization (tenant)" />
              ) : (
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
                    <Option value="__hint_empty" disabled text="No matches">No matches</Option>
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
              )}
            </Field>

            <Field
              label="Value"
              hint={`Data type: ${ext.dataType}`}
              required
            >
              <Input
                value={value}
                onChange={(_, d) => setValue(d.value)}
                placeholder={
                  ext.dataType === 'Boolean'
                    ? 'true or false'
                    : ext.dataType === 'Integer' || ext.dataType === 'LargeInteger'
                      ? 'e.g. 42'
                      : ext.dataType === 'DateTime'
                        ? 'ISO 8601, e.g. 2026-01-15T00:00:00Z'
                        : 'e.g. myValue'
                }
              />
            </Field>

            {readBack !== null && (
              <>
                <Caption1>Read-back confirmation:</Caption1>
                <div className={styles.readBack}>{readBack}</div>
                <MessageBar intent="success">
                  <MessageBarBody>
                    Value assigned and confirmed on the object.{' '}
                    <Badge appearance="tint" color="warning">
                      Remember to clear it if this was a test.
                    </Badge>
                  </MessageBarBody>
                </MessageBar>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={close} disabled={assign.isPending}>
              Close
            </Button>
            <Button
              appearance="primary"
              onClick={run}
              disabled={
                assign.isPending ||
                (!isOrg && !targetId.trim()) ||
                !value.trim()
              }
            >
              {assign.isPending ? <Spinner size="tiny" /> : 'Assign'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
