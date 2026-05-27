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
  Tab,
  TabList,
  Textarea,
  makeStyles,
} from '@fluentui/react-components';
import { Copy24Regular } from '@fluentui/react-icons';
import type {
  DirectoryExtensionProperty,
  SchemaExtension,
} from '@/types/extensions';
import {
  directoryExtensionAppManifestSnippet,
  directoryExtensionManifest,
  schemaExtensionManifest,
} from '@/utils/manifest';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '560px' },
  code: {
    fontFamily: 'var(--fontFamilyMonospace)',
    fontSize: '12px',
  },
});

type Props =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'schema';
      ext: SchemaExtension;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'directory';
      ext: DirectoryExtensionProperty;
    };

export function ManifestSnippetDialog(props: Props) {
  const styles = useStyles();
  const toast = useAppToast();
  const [tab, setTab] = useState<'graph' | 'manifest'>('graph');

  const graphBody =
    props.variant === 'schema'
      ? schemaExtensionManifest(props.ext)
      : directoryExtensionManifest(props.ext);

  const manifestBody =
    props.variant === 'schema'
      ? graphBody
      : directoryExtensionAppManifestSnippet(props.ext);

  const current = tab === 'graph' ? graphBody : manifestBody;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      toast.success('Copied to clipboard');
    } catch (e) {
      toast.error('Copy failed', e);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(_, d) => props.onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Copy definition snippet</DialogTitle>
          <DialogContent className={styles.body}>
            <TabList
              selectedValue={tab}
              onTabSelect={(_, d) => setTab(d.value as 'graph' | 'manifest')}
            >
              <Tab value="graph">Graph POST body</Tab>
              {props.variant === 'directory' && (
                <Tab value="manifest">App manifest snippet</Tab>
              )}
            </TabList>
            <Caption1>
              {props.variant === 'schema'
                ? 'Send as JSON to POST https://graph.microsoft.com/v1.0/schemaExtensions'
                : tab === 'graph'
                  ? 'Send as JSON to POST /applications/{id}/extensionProperties'
                  : 'Paste into your app registration manifest (extensionProperties)'}
            </Caption1>
            <Textarea
              className={styles.code}
              rows={14}
              readOnly
              value={current}
            />
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => props.onOpenChange(false)}>
              Close
            </Button>
            <Button appearance="primary" icon={<Copy24Regular />} onClick={copy}>
              Copy
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
