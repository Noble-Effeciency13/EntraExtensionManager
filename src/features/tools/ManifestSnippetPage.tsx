import { useState } from 'react';
import {
  Body1,
  Button,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ClipboardCode16Regular } from '@fluentui/react-icons';
import {
  ExtensionsOverview,
  OverviewExtension,
} from '@/components/ExtensionsOverview';
import { ManifestSnippetDialog } from '@/components/ManifestSnippetDialog';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: '16px' },
  intro: { color: tokens.colorNeutralForeground2, maxWidth: '720px' },
  panel: {
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
  },
});

export function ManifestSnippetPage() {
  const styles = useStyles();
  const [target, setTarget] = useState<OverviewExtension | null>(null);

  return (
    <div className={styles.page}>
      <Title2>Manifest snippet</Title2>
      <Body1 className={styles.intro}>
        Pick any extension to generate a ready-to-paste Graph POST body or
        app-manifest entry. This tool is read-only — nothing is written to the
        tenant.
      </Body1>
      <div className={styles.panel}>
        <ExtensionsOverview
          renderActions={(src) => (
            <Button
              size="small"
              icon={<ClipboardCode16Regular />}
              onClick={() => setTarget(src)}
            >
              Snippet
            </Button>
          )}
        />
      </div>
      {target?.kind === 'schema' && (
        <ManifestSnippetDialog
          variant="schema"
          open={true}
          onOpenChange={(o) => !o && setTarget(null)}
          ext={target.ext}
        />
      )}
      {target?.kind === 'directory' && (
        <ManifestSnippetDialog
          variant="directory"
          open={true}
          onOpenChange={(o) => !o && setTarget(null)}
          ext={target.ext}
        />
      )}
    </div>
  );
}
