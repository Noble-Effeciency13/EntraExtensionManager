import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Radio,
  RadioGroup,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Textarea,
  makeStyles,
} from '@fluentui/react-components';
import {
  ArrowSync24Regular,
  Edit24Regular,
  Search24Regular,
  QuestionCircle24Regular,
} from '@fluentui/react-icons';
import {
  BULK_COLLECTIONS,
  bulkObjectKey,
  bulkTargetTypes,
  parseBulkValue,
  useBulkObjects,
  useBulkUpdate,
  type BulkExtension,
  type BulkObject,
} from '@/api/bulkUpdate';
import { useMode } from '@/auth/mode';
import {
  assignmentFilterSummary,
  validateFilters,
  type AssignmentFilter,
} from '@/api/assignmentFilters';
import { AssignmentFilterBuilder } from './AssignmentFilterBuilder';
import { useTour } from './tour/TourProvider';

const useStyles = makeStyles({
  surface: { width: '800px', maxWidth: 'calc(100vw - 32px)' },
  content: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  targets: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
  objects: { maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' },
  cell: { overflowWrap: 'anywhere', minWidth: '100px' },
});

interface Props {
  extension: BulkExtension;
  onClose: () => void;
  assignmentMode?: 'single' | 'bulk';
}

export function BulkUpdateDialog({ extension, onClose, assignmentMode = 'bulk' }: Props) {
  const styles = useStyles();
  const { isEdit } = useMode();
  const tour = useTour();
  const declaredTargets = bulkTargetTypes(extension);
  const unsupported = declaredTargets.filter((target) => !BULK_COLLECTIONS[target]);
  const single = assignmentMode === 'single';
  const [targetTypes, setTargetTypes] = useState(() =>
    single
      ? declaredTargets.filter((target) => BULK_COLLECTIONS[target]).slice(0, 1)
      : declaredTargets.filter((target) => BULK_COLLECTIONS[target]),
  );
  const [scope, setScope] = useState('selected');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [resultPage, setResultPage] = useState(0);
  const [draftFilters, setDraftFilters] = useState<AssignmentFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AssignmentFilter[]>([]);
  const [valueText, setValueText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ objects: BulkObject[]; valueText: string } | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const objectsQuery = useBulkObjects(targetTypes, isEdit, appliedFilters);
  const update = useBulkUpdate(extension);
  const attribute = extension.variant === 'schema' ? extension.ext.id : extension.ext.name;
  const objects = objectsQuery.data ?? [];
  const visible = objects.filter((object) =>
    `${object.targetType} ${object.displayName} ${object.id}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const selectedObjects = objects.filter((object) => selected.has(bulkObjectKey(object)));
  const busy = update.isPending || objectsQuery.isFetching;
  const filtersDirty = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / 50) - 1));
  const pageRows = visible.slice(currentPage * 50, (currentPage + 1) * 50);

  const resetReview = () => {
    setReview(null);
    setError(null);
    update.reset();
  };

  const prepare = async () => {
    setError(null);
    try {
      if (filtersDirty) throw new Error('Apply or clear the edited filters before continuing.');
      parseBulkValue(extension, valueText);
      const refreshed = await objectsQuery.refetch();
      if (refreshed.error) throw refreshed.error;
      const available = refreshed.data ?? [];
      const chosen =
        scope === 'all'
          ? available
          : available.filter((object) => selected.has(bulkObjectKey(object)));
      if (!chosen.length) throw new Error('Select at least one object.');
      if (scope === 'selected' && chosen.length !== selectedObjects.length) {
        throw new Error('The available objects changed. Review your selection and try again.');
      }
      setReview({ objects: chosen, valueText });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const run = async () => {
    if (!isEdit || !review) return;
    setProgress({ completed: 0, total: review.objects.length });
    setError(null);
    try {
      await update.mutateAsync({
        ...review,
        onProgress: (completed, total) => setProgress({ completed, total }),
      });
      setReview(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const failures = update.data?.filter((result) => !result.success) ?? [];

  return (
    <Dialog
      open
      modalType={tour.isOpen ? 'non-modal' : 'modal'}
      onOpenChange={(_, data) => {
        if (!data.open && !update.isPending && !tour.isOpen) onClose();
      }}
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>{single ? 'Assign value' : 'Bulk Update'}</DialogTitle>
          <DialogContent className={styles.content}>
            <code style={{ overflowWrap: 'anywhere' }}>{attribute}</code>
            {!review && !update.isPending && !update.data && (
              <Button
                appearance="subtle"
                icon={<QuestionCircle24Regular />}
                onClick={() =>
                  tour.start([
                    {
                      title: 'Assign a value to a single object',
                      body: 'For a single-object write, check exactly one object. Schema values use a JSON object of declared properties. Directory values use the declared primitive type.',
                      target: 'assignment-objects',
                    },
                    {
                      title: 'Bulk assign or update values',
                      body: single
                        ? 'Close this dialog and use the adjacent Bulk Assign/Update button to select multiple objects or all matching objects.'
                        : 'Choose Selected objects and check multiple rows, including different declared target types. Choose All available objects to write to every object matching the applied property filters, not just the current page.',
                      target: 'assignment-targets',
                    },
                    {
                      title: 'Narrow the target set',
                      body: 'Add conditions such as Department Equals Engineering AND ExtensionAttribute1 Equals West. Apply filters to refresh the matching set. Membership filters take a group or administrative unit GUID and use direct membership.',
                      target: 'assignment-filters',
                    },
                    {
                      title: 'Review before writing',
                      body: 'Enter the value, review the refreshed object count and applied filters, then confirm. Successful writes persist; failures are listed individually. The quick search changes visible rows only.',
                      target: 'assignment-value',
                    },
                  ])
                }
              >
                Assignment walkthrough
              </Button>
            )}
            {!isEdit && (
              <MessageBar intent="warning">
                <MessageBarBody>Bulk Update requires Edit mode.</MessageBarBody>
              </MessageBar>
            )}
            {unsupported.length > 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Not supported with the application's directory permissions:{' '}
                  {unsupported.join(', ')}. These target types are excluded.
                </MessageBarBody>
              </MessageBar>
            )}
            {!review && !update.isPending && !update.data && (
              <>
                <Field label="Target types" data-tour="assignment-targets">
                  <div className={styles.targets}>
                    {declaredTargets.map((target) => (
                      <Checkbox
                        key={target}
                        label={target}
                        disabled={!isEdit || !BULK_COLLECTIONS[target] || busy}
                        checked={targetTypes.includes(target)}
                        onChange={(_, data) => {
                          resetReview();
                          setSelected(new Set());
                          setPage(0);
                          setTargetTypes(
                            single
                              ? [target]
                              : data.checked
                                ? [...targetTypes, target]
                                : targetTypes.filter((entry) => entry !== target),
                          );
                        }}
                      />
                    ))}
                  </div>
                </Field>
                {!single && (
                  <Field label="Apply to">
                    <RadioGroup
                      layout="horizontal"
                      value={scope}
                      disabled={!isEdit || busy}
                      onChange={(_, data) => {
                        resetReview();
                        setScope(data.value);
                      }}
                    >
                      <Radio value="selected" label="Selected objects" />
                      <Radio value="all" label="All available objects" />
                    </RadioGroup>
                  </Field>
                )}
                <AssignmentFilterBuilder
                  targetTypes={targetTypes}
                  filters={draftFilters}
                  disabled={busy || !isEdit}
                  onChange={(filters) => {
                    setDraftFilters(filters);
                    resetReview();
                  }}
                  onApply={() => {
                    try {
                      validateFilters(draftFilters);
                      setAppliedFilters(draftFilters.map((filter) => ({ ...filter })));
                      setSelected(new Set());
                      setPage(0);
                      resetReview();
                    } catch (failure) {
                      setError(failure instanceof Error ? failure.message : String(failure));
                    }
                  }}
                  onClear={() => {
                    setDraftFilters([]);
                    setAppliedFilters([]);
                    setSelected(new Set());
                    setPage(0);
                    resetReview();
                  }}
                />
                {appliedFilters.length > 0 && (
                  <div aria-label="Applied property filters">
                    {assignmentFilterSummary(appliedFilters)}
                  </div>
                )}
                <div className={styles.toolbar}>
                  <Input
                    aria-label="Filter objects"
                    placeholder="Filter objects"
                    contentBefore={<Search24Regular />}
                    value={search}
                    onChange={(_, data) => {
                      setSearch(data.value);
                      setPage(0);
                    }}
                  />
                  <Button
                    icon={<ArrowSync24Regular />}
                    disabled={busy || !isEdit || !targetTypes.length}
                    onClick={() => {
                      void objectsQuery.refetch();
                    }}
                  >
                    Refresh objects
                  </Button>
                  <span>
                    {objects.length} {appliedFilters.length ? 'matching' : 'available'} ·{' '}
                    {scope === 'all' ? objects.length : selectedObjects.length} selected
                  </span>
                </div>
                {objectsQuery.isFetching && <Spinner size="tiny" label="Loading all objects..." />}
                {objectsQuery.error && (
                  <MessageBar intent="error">
                    <MessageBarBody>{objectsQuery.error.message}</MessageBarBody>
                  </MessageBar>
                )}
                <div className={styles.objects} data-tour="assignment-objects">
                  <Table aria-label="Available objects">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Select</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Object</TableHeaderCell>
                        <TableHeaderCell>Object ID</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((object) => {
                        const key = bulkObjectKey(object);
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <Checkbox
                                aria-label={`Select ${object.targetType} ${object.displayName}`}
                                checked={scope === 'all' || selected.has(key)}
                                disabled={scope === 'all' || busy || !isEdit}
                                onChange={(_, data) => {
                                  const next = single ? new Set<string>() : new Set(selected);
                                  if (data.checked) next.add(key);
                                  else next.delete(key);
                                  setSelected(next);
                                  resetReview();
                                }}
                              />
                            </TableCell>
                            <TableCell>{object.targetType}</TableCell>
                            <TableCell className={styles.cell}>{object.displayName}</TableCell>
                            <TableCell className={styles.cell}>{object.id}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className={styles.toolbar}>
                  <Button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                    Previous objects
                  </Button>
                  <span>
                    {visible.length ? currentPage * 50 + 1 : 0}-
                    {Math.min((currentPage + 1) * 50, visible.length)} of {visible.length}
                  </span>
                  <Button
                    disabled={(currentPage + 1) * 50 >= visible.length}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next objects
                  </Button>
                </div>
                <Field
                  label={extension.variant === 'schema' ? 'Property values (JSON)' : 'Value'}
                  required
                  data-tour="assignment-value"
                  hint={
                    extension.variant === 'schema'
                      ? extension.ext.properties
                          .map((property) => `${property.name}: ${property.type}`)
                          .join(', ')
                      : `Data type: ${extension.ext.dataType}`
                  }
                >
                  {extension.variant === 'schema' ? (
                    <Textarea
                      value={valueText}
                      rows={5}
                      disabled={!isEdit || busy}
                      onChange={(_, data) => {
                        resetReview();
                        setValueText(data.value);
                      }}
                    />
                  ) : (
                    <Input
                      value={valueText}
                      disabled={!isEdit || busy}
                      onChange={(_, data) => {
                        resetReview();
                        setValueText(data.value);
                      }}
                    />
                  )}
                </Field>
              </>
            )}
            {review && !update.isPending && (
              <>
                <MessageBar intent="warning">
                  <MessageBarBody>
                    Permanently update {review.objects.length} object(s) across{' '}
                    {[...new Set(review.objects.map((object) => object.targetType))].join(', ')}?
                    Existing values for the supplied properties will be overwritten. This operation
                    cannot be undone here.
                    {appliedFilters.length > 0 && (
                      <> Applied filters: {assignmentFilterSummary(appliedFilters)}.</>
                    )}
                  </MessageBarBody>
                </MessageBar>
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {review.valueText}
                </pre>
              </>
            )}
            {update.isPending && (
              <Spinner label={`Updating objects: ${progress.completed} / ${progress.total}`} />
            )}
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            {update.data && (
              <>
                <MessageBar intent={failures.length ? 'warning' : 'success'}>
                  <MessageBarBody>
                    {update.data.length - failures.length} updated · {failures.length} failed
                  </MessageBarBody>
                </MessageBar>
                <div className={styles.objects}>
                  <Table aria-label="Bulk update results">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Object</TableHeaderCell>
                        <TableHeaderCell>Result</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {update.data.slice(resultPage * 50, (resultPage + 1) * 50).map((result) => (
                        <TableRow key={bulkObjectKey(result)}>
                          <TableCell>{result.targetType}</TableCell>
                          <TableCell className={styles.cell}>
                            {result.displayName}
                            <br />
                            {result.id}
                          </TableCell>
                          <TableCell className={styles.cell}>
                            {result.success ? 'Updated' : result.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className={styles.toolbar}>
                  <Button disabled={resultPage === 0} onClick={() => setResultPage(resultPage - 1)}>
                    Previous results
                  </Button>
                  <span>
                    {resultPage * 50 + 1}-{Math.min((resultPage + 1) * 50, update.data.length)} of{' '}
                    {update.data.length}
                  </span>
                  <Button
                    disabled={(resultPage + 1) * 50 >= update.data.length}
                    onClick={() => setResultPage(resultPage + 1)}
                  >
                    Next results
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={update.isPending}>
              Close
            </Button>
            {review && !update.isPending && <Button onClick={() => setReview(null)}>Back</Button>}
            {!update.data && (
              <Button
                appearance="primary"
                icon={<Edit24Regular />}
                disabled={
                  !isEdit ||
                  busy ||
                  filtersDirty ||
                  !targetTypes.length ||
                  !!objectsQuery.error ||
                  (scope === 'selected' ? !selectedObjects.length : !objects.length)
                }
                onClick={() => {
                  void (review ? run() : prepare());
                }}
              >
                {review ? 'Confirm update' : 'Review update'}
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
