import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Option,
  Dropdown,
  Textarea,
  Divider,
  MessageBar,
  MessageBarBody,
  makeStyles,
} from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import {
  allowedPropertyTypesForTargets,
  incompatibleTargetsForPropertyType,
  schemaExtensionFormSchema,
  schemaExtensionTargetTypeValues,
  type AppRegistration,
  type SchemaExtension,
  type SchemaExtensionForm,
} from '@/types/extensions';
import {
  useCreateSchemaExtension,
  useUpdateSchemaExtension,
} from '@/api/schemaExtensions';
import { AppPicker } from '@/components/AppPicker';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '560px',
    maxWidth: '100%',
    maxHeight: '70vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  propsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
    width: '100%',
  },
  propRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 160px) auto',
    gap: '8px',
    alignItems: 'end',
    minWidth: 0,
    width: '100%',
  },
  cell: {
    minWidth: 0,
    width: '100%',
    // Override Fluent's default min-width on the Dropdown trigger so the
    // Type column can shrink to the 160px track.
    '& > div, & button': { minWidth: 0, width: '100%' },
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SchemaExtension | null;
}

export function SchemaExtensionEditor({ open, onOpenChange, existing }: Props) {
  const styles = useStyles();
  const create = useCreateSchemaExtension();
  const update = useUpdateSchemaExtension();
  const toast = useAppToast();
  const isEdit = !!existing;
  const isLocked = existing?.status === 'Available' || existing?.status === 'Deprecated';

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SchemaExtensionForm>({
    resolver: zodResolver(schemaExtensionFormSchema),
    defaultValues: {
      id: '',
      description: '',
      targetTypes: [],
      properties: [{ name: '', type: 'String' }],
      owner: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'properties' });

  const [ownerApp, setOwnerApp] = useState<AppRegistration | undefined>(undefined);

  // Watch the selected target types so the property Type dropdowns can hide
  // options that Microsoft Graph would reject for the chosen targets (e.g.
  // Binary on a Message/Event/Post target).
  const selectedTargetTypes = (useWatch({ control, name: 'targetTypes' }) ??
    []) as string[];
  const allowedPropertyTypes = allowedPropertyTypesForTargets(selectedTargetTypes);
  const binaryBlockers = incompatibleTargetsForPropertyType(
    'Binary',
    selectedTargetTypes,
  );

  useEffect(() => {
    if (open) {
      reset(
        existing
          ? {
              id: existing.id,
              description: existing.description ?? '',
              targetTypes: existing.targetTypes,
              properties:
                existing.properties && existing.properties.length > 0
                  ? existing.properties
                  : [{ name: '', type: 'String' }],
              owner: existing.owner,
            }
          : {
              id: '',
              description: '',
              targetTypes: [],
              properties: [{ name: '', type: 'String' }],
              owner: '',
            },
      );
      setOwnerApp(undefined);
    }
  }, [open, existing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && existing) {
        await update.mutateAsync({
          id: existing.id,
          description: values.description,
          targetTypes: isLocked ? undefined : values.targetTypes,
          properties: isLocked ? undefined : values.properties,
        });
        toast.success('Schema extension updated', existing.id);
      } else {
        await create.mutateAsync(values);
        toast.success('Schema extension created', values.id);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(isEdit ? 'Update failed' : 'Create failed', e);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <form onSubmit={onSubmit}>
          <DialogBody>
            <DialogTitle>
              {isEdit ? `Edit ${existing?.id}` : 'New schema extension'}
            </DialogTitle>
            <DialogContent className={styles.body}>
              {isLocked && (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    This extension is <strong>{existing?.status}</strong>. Target
                    types and properties are locked; only description can be
                    edited.
                  </MessageBarBody>
                </MessageBar>
              )}

              <Field
                label="Id"
                required
                hint="Provide a short, unique name. Graph will return it qualified with your verified domain (e.g. contoso_courses)."
                validationMessage={errors.id?.message}
                validationState={errors.id ? 'error' : undefined}
              >
                <Input
                  {...register('id')}
                  placeholder="e.g. courses"
                  disabled={isEdit}
                />
              </Field>

              <Field
                label="Description"
                required
                validationMessage={errors.description?.message}
                validationState={errors.description ? 'error' : undefined}
              >
                <Textarea rows={2} {...register('description')} />
              </Field>

              <Controller
                control={control}
                name="targetTypes"
                render={({ field }) => (
                  <Field
                    label="Target types"
                    required
                    validationMessage={errors.targetTypes?.message as string | undefined}
                    validationState={errors.targetTypes ? 'error' : undefined}
                  >
                    <Dropdown
                      multiselect
                      disabled={isLocked}
                      placeholder="Select target types"
                      selectedOptions={field.value}
                      value={field.value.join(', ')}
                      onOptionSelect={(_, d) => field.onChange(d.selectedOptions)}
                    >
                      {schemaExtensionTargetTypeValues.map((t) => (
                        <Option key={t} value={t}>
                          {t}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="owner"
                render={({ field }) =>
                  isEdit ? (
                    <Field
                      label="Owner appId"
                      hint="The app that owns this extension. Locked after creation."
                    >
                      <Input value={field.value ?? ''} disabled />
                    </Field>
                  ) : (
                    <AppPicker
                      label="Owner appId"
                      hint="Optional. Defaults to the signed-in app's appId when omitted. Pick the owning app registration."
                      enabled={open}
                      value={ownerApp}
                      onChange={(app) => {
                        setOwnerApp(app);
                        field.onChange(app?.appId ?? '');
                      }}
                    />
                  )
                }
              />

              <Divider />

              <div className={styles.propsList}>
                <strong>Properties</strong>
                {binaryBlockers.length > 0 && (
                  <MessageBar intent="info">
                    <MessageBarBody>
                      <strong>Binary</strong> isn't available because{' '}
                      {binaryBlockers.join(', ')} {binaryBlockers.length > 1 ? 'are' : 'is'}{' '}
                      selected. Binary properties are only valid on directory
                      objects (User, Group, Device, Organization).
                    </MessageBarBody>
                  </MessageBar>
                )}
                {fields.map((f, idx) => (
                  <div key={f.id} className={styles.propRow}>
                    <Field
                      className={styles.cell}
                      label={idx === 0 ? 'Name' : undefined}
                      validationMessage={errors.properties?.[idx]?.name?.message}
                      validationState={errors.properties?.[idx]?.name ? 'error' : undefined}
                    >
                      <Input
                        {...register(`properties.${idx}.name` as const)}
                        placeholder="propertyName"
                        disabled={isLocked}
                      />
                    </Field>
                    <Controller
                      control={control}
                      name={`properties.${idx}.type` as const}
                      render={({ field }) => (
                        <Field
                          className={styles.cell}
                          label={idx === 0 ? 'Type' : undefined}
                          validationMessage={errors.properties?.[idx]?.type?.message}
                          validationState={
                            errors.properties?.[idx]?.type ? 'error' : undefined
                          }
                        >
                          <Dropdown
                            disabled={isLocked}
                            selectedOptions={[field.value]}
                            value={field.value}
                            onOptionSelect={(_, d) =>
                              field.onChange(d.optionValue ?? field.value)
                            }
                          >
                            {allowedPropertyTypes.map((t) => (
                              <Option key={t} value={t}>
                                {t}
                              </Option>
                            ))}
                          </Dropdown>
                        </Field>
                      )}
                    />
                    <Button
                      appearance="subtle"
                      icon={<Delete20Regular />}
                      aria-label="Remove property"
                      disabled={isLocked || fields.length <= 1}
                      onClick={() => remove(idx)}
                    />
                  </div>
                ))}
                {typeof errors.properties?.message === 'string' && (
                  <MessageBar intent="error">
                    <MessageBarBody>{errors.properties.message}</MessageBarBody>
                  </MessageBar>
                )}
                <Button
                  appearance="secondary"
                  icon={<Add20Regular />}
                  disabled={isLocked}
                  onClick={() => append({ name: '', type: 'String' })}
                  type="button"
                >
                  Add property
                </Button>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button appearance="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
