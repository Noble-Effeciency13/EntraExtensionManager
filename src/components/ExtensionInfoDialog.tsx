import {
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Link,
  Subtitle2,
  makeStyles,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '520px',
  },
});

export type ExtensionInfoVariant = 'schema' | 'directory';

interface Props {
  open: boolean;
  variant: ExtensionInfoVariant;
  onOpenChange: (open: boolean) => void;
}

export function ExtensionInfoDialog({ open, variant, onOpenChange }: Props) {
  const styles = useStyles();
  const isSchema = variant === 'schema';
  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {isSchema ? 'About schema extensions' : 'About directory extensions'}
          </DialogTitle>
          <DialogContent className={styles.body}>
            {isSchema ? (
              <>
                <Body1>
                  A <strong>schema extension</strong> defines a strongly typed,
                  named bag of properties that can be added to directory
                  resource types (user, group, message, event, post, contact,
                  device, organization, …). Each extension carries multiple
                  properties of mixed types in a single payload, identified by
                  a unique id (often <code>{'{owner}'}_{'{name}'}</code>).
                </Body1>
                <Subtitle2>Lifecycle</Subtitle2>
                <Body1>
                  Definitions move through three statuses:{' '}
                  <strong>InDevelopment</strong> (only the owning tenant sees
                  it; properties can be added) → <strong>Available</strong>{' '}
                  (visible to all tenants, schema locked) →{' '}
                  <strong>Deprecated</strong> (read-only). The{' '}
                  <code>/schemaExtensions</code> endpoint is global, so once
                  Available, every tenant's listing includes it.
                </Body1>
                <Subtitle2>Where it's used</Subtitle2>
                <Body1>
                  Best for shared, multi-property data shapes that multiple
                  resource types should adopt — for example a "compliance" bag
                  on user + group, or a vendor's structured payload on message
                  + event. Values are read/written via{' '}
                  <code>$select=extensionId</code> on the target resource.
                </Body1>
              </>
            ) : (
              <>
                <Body1>
                  A <strong>directory extension</strong> (also called an Azure
                  AD extension or <em>extensionProperty</em>) is a single
                  named, single-typed attribute attached to an app
                  registration. Once defined on the app, it can be set on the
                  selected target object types (User, Group, Application,
                  Organization, Device, AdministrativeUnit) under a
                  fully-qualified name like{' '}
                  <code>extension_{'{appId}'}_{'{name}'}</code>.
                </Body1>
                <Subtitle2>Lifecycle</Subtitle2>
                <Body1>
                  Extensions are tenant-scoped and tied to their owning app
                  registration; deleting the app removes its extensions and
                  their values. They have no schema versioning — once created
                  the type and targets are fixed.
                </Body1>
                <Subtitle2>Where it's used</Subtitle2>
                <Body1>
                  Best for simple per-resource custom attributes consumed by
                  Conditional Access filters, claim mappings into tokens,
                  workflows in Entra ID Governance, dynamic group rules, and
                  HR / lifecycle attributes synced into the directory.
                </Body1>
              </>
            )}
            <Caption1>
              Reference:{' '}
              <Link
                href={
                  isSchema
                    ? 'https://learn.microsoft.com/graph/api/resources/schemaextension'
                    : 'https://learn.microsoft.com/graph/api/resources/extensionproperty'
                }
                target="_blank"
                rel="noreferrer"
              >
                Microsoft Graph documentation
              </Link>
            </Caption1>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
