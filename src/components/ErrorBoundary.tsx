import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  ErrorCircle24Regular,
  Open16Regular,
} from '@fluentui/react-icons';

const REPO_ISSUES_URL =
  'https://github.com/Noble-Effeciency13/EntraExtensionManager/issues/new';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    padding: '32px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  icon: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: '40px',
    lineHeight: '40px',
  },
  message: {
    color: tokens.colorNeutralForeground2,
  },
  details: {
    margin: 0,
    padding: '12px',
    maxHeight: '160px',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
});

function ErrorFallback({ error }: { error: Error }) {
  const styles = useStyles();
  const reportUrl =
    `${REPO_ISSUES_URL}?title=` +
    encodeURIComponent(`[bug] ${error.name}: ${error.message}`.slice(0, 120)) +
    `&body=` +
    encodeURIComponent(
      `**What happened?**\n\n\n**Error**\n\n\`\`\`\n${error.message}\n\`\`\`\n`,
    );
  return (
    <div className={styles.root}>
      <div className={styles.card} role="alert">
        <ErrorCircle24Regular className={styles.icon} aria-hidden="true" />
        <Title2>Something went wrong</Title2>
        <Body1 className={styles.message}>
          The portal hit an unexpected error and couldn&rsquo;t continue.
          Reloading usually fixes it. If it keeps happening, please report it so
          it can be fixed.
        </Body1>
        <pre className={styles.details}>{error.message}</pre>
        <div className={styles.actions}>
          <Button
            appearance="primary"
            icon={<ArrowClockwise24Regular />}
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
          <Button
            as="a"
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Open16Regular />}
          >
            Report on GitHub
          </Button>
        </div>
        <Caption1>No data is sent automatically — the report opens GitHub.</Caption1>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary. Catches render/lifecycle exceptions anywhere
 * below it and shows a friendly recovery screen instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
