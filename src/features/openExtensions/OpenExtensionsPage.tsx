import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Body1,
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
  Option,
  Spinner,
  Textarea,
  Title2,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Add24Regular,
  ArrowSync24Regular,
  Code24Regular,
  Delete24Regular,
  Edit24Regular,
  Search24Regular,
} from '@fluentui/react-icons';
import {
  useCreateOpenExtension,
  useDeleteOpenExtension,
  useOpenExtensions,
  useUpdateOpenExtension,
  type OpenExtensionInput,
} from '@/api/openExtensions';
import {
  useDirectoryObjectSearch,
  useOrganization,
  type DirectoryObjectResult,
} from '@/api/directoryObjects';
import {
  openExtensionResourceValues,
  type OpenExtensionInstance,
  type OpenExtensionResource,
} from '@/types/extensions';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAppToast } from '@/hooks/useAppToast';
import { useMode } from '@/auth/mode';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  hint: { marginBottom: '16px', maxWidth: '780px' },
  queryBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
  },
  resourceField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  objectField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 320px',
    minWidth: '260px',
  },
  listbox: {
    maxHeight: 'min(40vh, 320px)',
    overflowY: 'auto',
  },
  optionLabel: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  optionSecondary: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  extName: {
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    overflowWrap: 'anywhere',
  },
  cardActions: { marginLeft: 'auto', display: 'flex', gap: '4px' },
  json: {
    margin: 0,
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  loading: { display: 'flex', justifyContent: 'center', padding: '48px' },
  dialogBody: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '460px' },
});

const RESOURCE_LABELS: Record<OpenExtensionResource, string> = {
  User: 'User',
  Group: 'Group',
  Device: 'Device',
  Organization: 'Organization',
};

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXAMPLE_DATA = `{
  "settingName": "exampleValue",
  "enabled": true,
  "count": 42
}`;

function prettyData(data: Record<string, unknown>): string {
  return Object.keys(data).length === 0 ? '{}' : JSON.stringify(data, null, 2);
}

export function OpenExtensionsPage() {
  const styles = useStyles();
  const toast = useAppToast();
  const { isEdit } = useMode();

  const [resource, setResource] = useState<OpenExtensionResource>('User');
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<DirectoryObjectResult | null>(null);
  const [activeObjectId, setActiveObjectId] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OpenExtensionInstance | null>(null);
  const [deleting, setDeleting] = useState<OpenExtensionInstance | null>(null);

  const isOrg = resource === 'Organization';

  // Reset the lookup whenever the resource type changes.
  useEffect(() => {
    setSearchText('');
    setDebouncedQuery('');
    setSelected(null);
    setActiveObjectId('');
  }, [resource]);

  // Debounce the free-text query so we don't hit Graph on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchText), 300);
    return () => clearTimeout(handle);
  }, [searchText]);

  const searchQuery = useDirectoryObjectSearch(resource, debouncedQuery, !isOrg);
  const orgQuery = useOrganization(isOrg);

  // Organization is a singleton: auto-select it once resolved.
  useEffect(() => {
    if (isOrg && orgQuery.data?.id) {
      setSelected(orgQuery.data);
      setActiveObjectId(orgQuery.data.id);
    }
  }, [isOrg, orgQuery.data]);

  const q = useOpenExtensions(resource, activeObjectId, !!activeObjectId);
  const del = useDeleteOpenExtension(resource, activeObjectId);

  const items = useMemo(() => q.data ?? [], [q.data]);

  const trimmedSearch = searchText.trim();
  const looksLikeGuid = GUID_RE.test(trimmedSearch);
  const looksLikeUpn =
    resource === 'User' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedSearch);
  const canUseDirect = looksLikeGuid || looksLikeUpn;

  const commitSelection = (optionValue?: string) => {
    if (!optionValue || optionValue.startsWith('__hint')) return;
    if (optionValue.startsWith('__direct:')) {
      const id = optionValue.slice('__direct:'.length).trim();
      const result = { id, displayName: id };
      setSelected(result);
      setSearchText(id);
      setActiveObjectId(id);
      return;
    }
    if (optionValue.startsWith('__')) return; // disabled placeholder options
    const match = searchQuery.data?.find((r) => r.id === optionValue);
    if (match) {
      setSelected(match);
      setSearchText(match.displayName);
      setActiveObjectId(match.id);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Open extension deleted', deleting.id);
      setDeleting(null);
    } catch (e) {
      toast.error('Delete failed', e);
    }
  };

  const body = useMemo(() => {
    if (!activeObjectId) {
      return (
        <EmptyState
          icon={<Search24Regular />}
          title="Look up open extensions"
          description={
            isOrg
              ? 'Resolving the organization…'
              : `Search for a ${RESOURCE_LABELS[resource].toLowerCase()} by name${
                  resource === 'User' ? ' or UPN' : ''
                } — or paste an object id — to list the open extensions stored on it.`
          }
        />
      );
    }
    if (q.isLoading) {
      return (
        <div className={styles.loading}>
          <Spinner label="Loading open extensions…" />
        </div>
      );
    }
    if (q.error) {
      return (
        <EmptyState
          icon={<Code24Regular />}
          title="Couldn't load open extensions"
          description={(q.error as Error).message}
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon={<Code24Regular />}
          title="No open extensions"
          description={`This ${RESOURCE_LABELS[resource].toLowerCase()} has no open extensions.${
            isEdit ? ' Use “Add open extension” to create one.' : ''
          }`}
        />
      );
    }
    return (
      <div className={styles.list}>
        {items.map((it) => (
          <div key={it.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <Code24Regular />
              <span className={styles.extName}>{it.id}</span>
              <Badge appearance="tint" color="informative">
                {Object.keys(it.data).length} field
                {Object.keys(it.data).length === 1 ? '' : 's'}
              </Badge>
              {isEdit && (
                <div className={styles.cardActions}>
                  <Tooltip content="Edit data" relationship="label">
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Edit24Regular />}
                      onClick={() => {
                        setEditing(it);
                        setEditorOpen(true);
                      }}
                      aria-label={`Edit ${it.id}`}
                    />
                  </Tooltip>
                  <Tooltip content="Delete" relationship="label">
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete24Regular />}
                      onClick={() => setDeleting(it)}
                      aria-label={`Delete ${it.id}`}
                    />
                  </Tooltip>
                </div>
              )}
            </div>
            <pre className={styles.json}>{prettyData(it.data)}</pre>
          </div>
        ))}
      </div>
    );
  }, [activeObjectId, q.isLoading, q.error, items, resource, isEdit, isOrg, styles]);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Code24Regular />
          <Title2>Open extensions</Title2>
        </div>
        {isEdit && activeObjectId && (
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            Add open extension
          </Button>
        )}
      </div>

      <Body1 className={styles.hint}>
        Open extensions (<code>openTypeExtension</code>) are schemaless bags of
        custom data attached to an individual directory object — not tenant-wide
        definitions like schema or directory extensions. Pick a resource and an
        object to inspect or manage the open extensions stored on it.
      </Body1>

      <div className={styles.queryBar}>
        <div className={styles.resourceField}>
          <Caption1>Resource type</Caption1>
          <Dropdown
            value={RESOURCE_LABELS[resource]}
            selectedOptions={[resource]}
            onOptionSelect={(_, d) =>
              setResource((d.optionValue as OpenExtensionResource) ?? 'User')
            }
            style={{ minWidth: '160px' }}
          >
            {openExtensionResourceValues.map((r) => (
              <Option key={r} value={r}>
                {RESOURCE_LABELS[r]}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div className={styles.objectField}>
          <Caption1>
            {isOrg
              ? 'Organization'
              : `Search ${RESOURCE_LABELS[resource].toLowerCase()}s`}
          </Caption1>
          {isOrg ? (
            <Input
              readOnly
              value={
                orgQuery.isLoading
                  ? 'Loading organization…'
                  : orgQuery.error
                    ? 'Failed to load organization'
                    : (orgQuery.data?.displayName ?? '—')
              }
              contentBefore={<Search24Regular />}
            />
          ) : (
            <Combobox
              placeholder={`Type a name${
                resource === 'User' ? ', UPN' : ''
              } or paste an object id…`}
              value={selected ? selected.displayName : searchText}
              selectedOptions={selected ? [selected.id] : []}
              onInput={(e) => {
                setSearchText((e.target as HTMLInputElement).value);
                if (selected) setSelected(null);
              }}
              onOptionSelect={(_, d) => commitSelection(d.optionValue)}
              positioning={{
                autoSize: 'height-always',
                position: 'below',
                align: 'start',
              }}
              listbox={{ className: styles.listbox }}
            >
              {canUseDirect && (
                <Option value={`__direct:${trimmedSearch}`} text={trimmedSearch}>
                  Look up “{trimmedSearch}” directly
                </Option>
              )}
              {searchQuery.isFetching ? (
                <Option value="__hint_loading" disabled text="Searching">
                  Searching…
                </Option>
              ) : searchQuery.error ? (
                <Option value="__hint_error" disabled text="Error">
                  Search failed: {(searchQuery.error as Error).message}
                </Option>
              ) : debouncedQuery.trim().length < 2 ? (
                <Option value="__hint_min" disabled text="Keep typing">
                  Type at least 2 characters to search…
                </Option>
              ) : (searchQuery.data?.length ?? 0) === 0 ? (
                <Option value="__hint_empty" disabled text="No matches">
                  No matches
                </Option>
              ) : (
                searchQuery.data!.map((r) => (
                  <Option key={r.id} value={r.id} text={r.displayName}>
                    <div className={styles.optionLabel}>
                      <span>{r.displayName}</span>
                      {r.secondary && (
                        <span className={styles.optionSecondary}>
                          {r.secondary}
                        </span>
                      )}
                    </div>
                  </Option>
                ))
              )}
            </Combobox>
          )}
        </div>
        {activeObjectId && (
          <Tooltip content="Refresh" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowSync24Regular />}
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              aria-label="Refresh"
            />
          </Tooltip>
        )}
      </div>

      {body}

      {editorOpen && (
        <OpenExtensionEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          resource={resource}
          objectId={activeObjectId}
          editing={editing}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete open extension"
        body={
          <>
            Delete <strong>{deleting?.id}</strong> from this{' '}
            {RESOURCE_LABELS[resource].toLowerCase()}? This permanently removes
            the stored data and cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        busy={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}

interface EditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: OpenExtensionResource;
  objectId: string;
  editing: OpenExtensionInstance | null;
}

function OpenExtensionEditor({
  open,
  onOpenChange,
  resource,
  objectId,
  editing,
}: EditorProps) {
  const styles = useStyles();
  const toast = useAppToast();
  const create = useCreateOpenExtension(resource, objectId);
  const update = useUpdateOpenExtension(resource, objectId);

  const [name, setName] = useState(editing?.id ?? '');
  const [dataText, setDataText] = useState(
    editing ? prettyData(editing.data) : '',
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isEditing = !!editing;
  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (!name.trim()) return;
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(dataText || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Data must be a JSON object.');
        return;
      }
      // Reserved keys are managed by Graph and must not be part of the payload.
      data = parsed as Record<string, unknown>;
      for (const k of ['id', 'extensionName', '@odata.type']) {
        if (k in data) delete data[k];
      }
    } catch (e) {
      setJsonError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }

    const input: OpenExtensionInput = { extensionName: name.trim(), data };
    try {
      if (isEditing) {
        await update.mutateAsync(input);
        toast.success('Open extension updated', name.trim());
      } else {
        await create.mutateAsync(input);
        toast.success('Open extension created', name.trim());
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(isEditing ? 'Update failed' : 'Create failed', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {isEditing ? 'Edit open extension' : 'Add open extension'}
          </DialogTitle>
          <DialogContent className={styles.dialogBody}>
            <Field
              label="Extension name"
              hint="A unique name, e.g. com.contoso.roamingSettings"
              required
            >
              <Input
                value={name}
                onChange={(_, d) => setName(d.value)}
                disabled={isEditing}
                placeholder="com.contoso.roamingSettings"
              />
            </Field>
            <Field
              label="Data (JSON object)"
              validationMessage={jsonError ?? undefined}
              validationState={jsonError ? 'error' : 'none'}
              hint={
                isEditing
                  ? 'Custom key/value properties stored on the extension.'
                  : 'Custom key/value properties stored on the extension. The greyed text is an example — replace it with your own JSON object.'
              }
            >
              <Textarea
                value={dataText}
                onChange={(_, d) => {
                  setDataText(d.value);
                  if (jsonError) setJsonError(null);
                }}
                placeholder={isEditing ? undefined : `Example:\n${EXAMPLE_DATA}`}
                textarea={{ rows: 10, style: { fontFamily: 'monospace' } }}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={submit}
              disabled={busy || !name.trim()}
            >
              {busy ? <Spinner size="tiny" /> : isEditing ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
