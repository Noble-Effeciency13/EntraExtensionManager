import { useState } from 'react';
import {
  Button,
  Caption1,
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
} from '@fluentui/react-components';
import { useDryRunExtensionValue } from '@/api/dryRun';
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
              label="Target object id"
              hint={
                targetType === 'User'
                  ? 'Object id or userPrincipalName'
                  : 'Object id (GUID)'
              }
            >
              <Input
                value={targetId}
                onChange={(_, d) => setTargetId(d.value)}
                placeholder={
                  targetType === 'User'
                    ? 'user@contoso.com or 00000000-0000-…'
                    : '00000000-0000-…'
                }
              />
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
