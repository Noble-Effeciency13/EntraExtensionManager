import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
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
  makeStyles,
} from '@fluentui/react-components';
import {
  directoryExtensionDataTypeValues,
  directoryExtensionFormSchema,
  directoryExtensionTargetValues,
  type AppRegistration,
  type DirectoryExtensionForm,
} from '@/types/extensions';
import { useCreateExtensionProperty } from '@/api/directoryExtensions';
import { AppPicker } from '@/components/AppPicker';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px' },
});

interface Props {
  /** When provided the picker is hidden and the dialog targets that app. */
  appObjectId?: string;
  /** Optional display name shown in the dialog title. */
  appDisplayName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectoryExtensionEditor({
  appObjectId,
  appDisplayName,
  open,
  onOpenChange,
}: Props) {
  const styles = useStyles();
  const toast = useAppToast();
  const pickAppNeeded = !appObjectId;

  // App picker state (only used when no appObjectId was supplied)
  const [pickedApp, setPickedApp] = useState<AppRegistration | undefined>(undefined);
  const [pickerError, setPickerError] = useState<string | undefined>(undefined);

  const effectiveAppObjectId = appObjectId ?? pickedApp?.id;
  const effectiveAppDisplayName = appDisplayName ?? pickedApp?.displayName;

  const create = useCreateExtensionProperty(effectiveAppObjectId ?? '');

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DirectoryExtensionForm>({
    resolver: zodResolver(directoryExtensionFormSchema),
    defaultValues: { name: '', dataType: 'String', targetObjects: [] },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', dataType: 'String', targetObjects: [] });
      setPickedApp(undefined);
      setPickerError(undefined);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!effectiveAppObjectId) {
      setPickerError('Select the owning application before creating an extension.');
      return;
    }
    try {
      await create.mutateAsync(values);
      toast.success(
        'Extension property created',
        effectiveAppDisplayName
          ? `${values.name} on ${effectiveAppDisplayName}`
          : values.name,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error('Create failed', e);
    }
  });

  const titleText = effectiveAppDisplayName
    ? `New extension property on "${effectiveAppDisplayName}"`
    : 'New extension property';

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <form onSubmit={onSubmit}>
          <DialogBody>
            <DialogTitle>{titleText}</DialogTitle>
            <DialogContent className={styles.body}>
              {pickAppNeeded && (
                <AppPicker
                  label="Owning application"
                  required
                  hint="Search by display name or appId. The extension will be defined on this app registration."
                  errorMessage={pickerError}
                  enabled={open}
                  value={pickedApp}
                  onChange={(app) => {
                    setPickedApp(app);
                    if (app) setPickerError(undefined);
                  }}
                />
              )}

              <Field
                label="Name"
                required
                hint="Letters and digits only. Graph will return it qualified as extension_{appId}_{name}."
                validationMessage={errors.name?.message}
                validationState={errors.name ? 'error' : undefined}
              >
                <Input {...register('name')} placeholder="e.g. employeeRegion" />
              </Field>

              <Controller
                control={control}
                name="dataType"
                render={({ field }) => (
                  <Field label="Data type" required>
                    <Dropdown
                      selectedOptions={[field.value]}
                      value={field.value}
                      onOptionSelect={(_, d) =>
                        field.onChange(d.optionValue ?? field.value)
                      }
                    >
                      {directoryExtensionDataTypeValues.map((t) => (
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
                name="targetObjects"
                render={({ field }) => (
                  <Field
                    label="Target objects"
                    required
                    validationMessage={errors.targetObjects?.message as string | undefined}
                    validationState={errors.targetObjects ? 'error' : undefined}
                  >
                    <Dropdown
                      multiselect
                      placeholder="Select target objects"
                      selectedOptions={field.value}
                      value={field.value.join(', ')}
                      onOptionSelect={(_, d) => field.onChange(d.selectedOptions)}
                    >
                      {directoryExtensionTargetValues.map((t) => (
                        <Option key={t} value={t}>
                          {t}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={isSubmitting || (pickAppNeeded && !effectiveAppObjectId)}
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {isSubmitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
