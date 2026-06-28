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
  directoryExtensionHttp,
  directoryExtensionManifest,
  directoryExtensionPowerShell,
  schemaExtensionHttp,
  schemaExtensionManifest,
  schemaExtensionPowerShell,
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

type SnippetTab = 'graph' | 'manifest' | 'powershell' | 'http';

export function ManifestSnippetDialog(props: Props) {
  const styles = useStyles();
  const toast = useAppToast();
  const [tab, setTab] = useState<SnippetTab>('graph');

  const snippets: Partial<Record<SnippetTab, string>> =
    props.variant === 'schema'
      ? {
          graph: schemaExtensionManifest(props.ext),
          powershell: schemaExtensionPowerShell(props.ext),
          http: schemaExtensionHttp(props.ext),
        }
      : {
          graph: directoryExtensionManifest(props.ext),
          manifest: directoryExtensionAppManifestSnippet(props.ext),
          powershell: directoryExtensionPowerShell(props.ext),
          http: directoryExtensionHttp(props.ext),
        };

  const current = snippets[tab] ?? snippets.graph ?? '';
  const caption =
    tab === 'manifest'
      ? 'Paste into your app registration manifest (extensionProperties).'
      : tab === 'powershell'
        ? 'Run with the Microsoft.Graph PowerShell SDK.'
        : tab === 'http'
          ? 'Raw Graph request — paste into Graph Explorer or an HTTP client.'
          : props.variant === 'schema'
            ? 'JSON body for POST /schemaExtensions.'
            : 'JSON body for POST /applications/{id}/extensionProperties.';

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
              onTabSelect={(_, d) => setTab(d.value as SnippetTab)}
            >
              <Tab value="graph">JSON body</Tab>
              {props.variant === 'directory' && (
                <Tab value="manifest">App manifest</Tab>
              )}
              <Tab value="powershell">PowerShell</Tab>
              <Tab value="http">HTTP</Tab>
            </TabList>
            <Caption1>{caption}</Caption1>
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
