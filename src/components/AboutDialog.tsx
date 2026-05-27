import {
  Avatar,
  Badge,
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Link,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minWidth: '520px',
  },
  authorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  authorMeta: { display: 'flex', flexDirection: 'column', gap: '4px' },
  links: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    fontFamily: tokens.fontFamilyMonospace,
  },
  scopeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    display: 'block',
    marginBottom: '2px',
  },
});

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const styles = useStyles();
  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>About Entra Extensions Manager</DialogTitle>
          <DialogContent className={styles.body}>
            <Body1>
              <strong>Entra Extensions Manager</strong> is a modern single-page
              web app for inspecting and managing custom schema and directory
              extensions in Microsoft Entra ID via Microsoft Graph. It is built
              for security and identity engineers who need a fast, focused UI
              alongside the Graph API.
            </Body1>

            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle} as="h3">What it does</Subtitle2>
              <ul>
                <li>
                  Lists tenant-visible <code>/schemaExtensions</code> with
                  server-side status &amp; owner filtering and incremental
                  paging so a busy global registry stays manageable.
                </li>
                <li>
                  Groups directory <code>extensionProperty</code> definitions
                  by their owning app registration in a collapsible, searchable
                  view — including apps that have none yet.
                </li>
                <li>
                  Two-mode operation: <strong>Read</strong> for safe inspection
                  using least-privilege scopes, <strong>Edit</strong> for full
                  CRUD with incremental consent on demand.
                </li>
                <li>
                  Typed forms (Zod) and destructive-action guards on delete and
                  status transitions.
                </li>
              </ul>
            </div>

            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle} as="h3">What it requires</Subtitle2>
              <Body1>
                Sign-in uses delegated Microsoft Graph permissions. Read mode
                requests the read scopes up front; Edit mode triggers
                incremental consent for the write scopes only when activated.
              </Body1>
              <Caption1>Read mode</Caption1>
              <ul className={styles.scopeList} aria-label="Read-mode scopes">
                <li>
                  <Badge appearance="tint" color="informative">
                    User.Read
                  </Badge>
                </li>
                <li>
                  <Badge appearance="tint" color="brand">
                    Application.Read.All
                  </Badge>
                </li>
                <li>
                  <Badge appearance="tint" color="brand">
                    Directory.Read.All
                  </Badge>
                </li>
                <li>
                  <Badge appearance="tint" color="brand">
                    AuditLog.Read.All
                  </Badge>
                </li>
              </ul>
              <Caption1>Edit mode (incremental consent)</Caption1>
              <ul className={styles.scopeList} aria-label="Edit-mode scopes">
                <li>
                  <Badge appearance="tint" color="danger">
                    Application.ReadWrite.All
                  </Badge>
                </li>
                <li>
                  <Badge appearance="tint" color="danger">
                    Directory.ReadWrite.All
                  </Badge>
                </li>
              </ul>
            </div>

            <Divider />

            <div className={styles.section}>
              <Subtitle2 className={styles.sectionTitle} as="h3">Author</Subtitle2>
              <div className={styles.authorCard}>
                <Avatar
                  name="Sebastian Flæng Markdanner"
                  image={{
                    src: 'https://raw.githubusercontent.com/Noble-Effeciency13/Noble-Effeciency13/main/.github/images/CompressedLightblueLogo.png',
                  }}
                  initials="SM"
                  color="colorful"
                  size={48}
                />
                <div className={styles.authorMeta}>
                  <strong>Sebastian Flæng Markdanner</strong>
                  <span className={styles.pill}>Microsoft Security MVP</span>
                  <div className={styles.links}>
                    <Link
                      href="https://linkedin.com/in/sebastian-markdanner"
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </Link>
                    <Link
                      href="https://github.com/Noble-Effeciency13"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub
                    </Link>
                    <Link
                      href="https://chanceofsecurity.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      chanceofsecurity.com
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
