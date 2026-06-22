import { Tooltip, makeStyles, tokens } from '@fluentui/react-components';

const REPO_URL = 'https://github.com/Noble-Effeciency13/EntraExtensionManager';
const REPO_LABEL = 'Noble-Effeciency13/EntraExtensionManager';
const TAGLINE = 'For the community by the community';
const AUTHOR = 'Sebastian Flæng Markdanner';
const LINKEDIN_URL = 'https://linkedin.com/in/sebastian-markdanner';
const GITHUB_URL = 'https://github.com/Noble-Effeciency13';
const WEBSITE_URL = 'https://chanceofsecurity.com';

const useStyles = makeStyles({
  footer: {
    gridArea: 'footer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    height: '36px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  tagline: {
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupDivider: {
    flexShrink: 0,
    width: '1px',
    height: '16px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  textLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    borderRadius: tokens.borderRadiusSmall,
    padding: '2px 6px',
    maxWidth: '100%',
    transitionProperty: 'color, background-color',
    transitionDuration: tokens.durationNormal,
    ':hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  textLinkLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  iconLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: tokens.colorNeutralForeground2,
    borderRadius: tokens.borderRadiusSmall,
    transitionProperty: 'color, background-color',
    transitionDuration: tokens.durationNormal,
    ':hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  mvpLogo: {
    height: '18px',
    width: 'auto',
    display: 'block',
    borderRadius: '2px',
  },
  author: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginLeft: '4px',
    marginRight: '4px',
  },
});

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.63 0H2.37A2.37 2.37 0 0 0 0 2.37v11.26C0 14.94 1.06 16 2.37 16h11.26A2.37 2.37 0 0 0 16 13.63V2.37C16 1.06 14.94 0 13.63 0zM4.84 13.63H2.49V6.06h2.35v7.57zM3.66 5.02a1.36 1.36 0 1 1 0-2.73 1.36 1.36 0 0 1 0 2.73zm9.97 8.61h-2.35V9.95c0-.88-.02-2-1.22-2-1.22 0-1.41.95-1.41 1.94v3.74H6.3V6.06h2.26v1.03h.03c.31-.6 1.08-1.22 2.23-1.22 2.39 0 2.83 1.57 2.83 3.61v4.15z" />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.4" />
      <ellipse cx="8" cy="8" rx="3.1" ry="6.4" />
      <line x1="1.7" y1="8" x2="14.3" y2="8" />
      <line x1="8" y1="1.6" x2="8" y2="14.4" />
    </svg>
  );
}

export function AppFooter() {
  const styles = useStyles();

  return (
    <footer className={styles.footer}>
      <div className={styles.section}>
        <Tooltip content="View the source on GitHub" relationship="label">
          <a
            className={styles.textLink}
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon />
            <span className={styles.textLinkLabel}>{REPO_LABEL}</span>
          </a>
        </Tooltip>
      </div>

      <span className={styles.groupDivider} role="separator" aria-orientation="vertical" />

      <div className={`${styles.section} ${styles.tagline}`}>
        <span>{TAGLINE}</span>
      </div>

      <span className={styles.groupDivider} role="separator" aria-orientation="vertical" />

      <div className={styles.section}>
        <Tooltip content="Microsoft MVP" relationship="label">
          <img
            src="/mvplogo.png"
            alt="Microsoft MVP"
            className={styles.mvpLogo}
          />
        </Tooltip>
        <span className={styles.author}>{AUTHOR}</span>
        <span className={styles.divider} role="separator" aria-orientation="vertical" />
        <Tooltip content="LinkedIn" relationship="label">
          <a
            className={styles.iconLink}
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon />
          </a>
        </Tooltip>
        <Tooltip content="GitHub" relationship="label">
          <a
            className={styles.iconLink}
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
          >
            <GitHubIcon />
          </a>
        </Tooltip>
        <Tooltip content="chanceofsecurity.com" relationship="label">
          <a
            className={styles.iconLink}
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Personal website"
          >
            <WebsiteIcon />
          </a>
        </Tooltip>
      </div>
    </footer>
  );
}
