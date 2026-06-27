import { ReactNode } from 'react';
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import {
  Button,
  Title2,
  Subtitle2,
  Body1,
  Caption1,
  Divider,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ShieldCheckmark20Regular,
  Eye20Regular,
  Cloud20Regular,
  Beaker20Regular,
} from '@fluentui/react-icons';
import { loginRequest } from './msalConfig';
import { useDemo } from '@/demo/DemoContext';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
    backgroundImage: `
      radial-gradient(circle at 15% 20%, ${tokens.colorBrandBackground2} 0%, transparent 45%),
      radial-gradient(circle at 85% 80%, ${tokens.colorBrandBackground2Hover} 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, ${tokens.colorNeutralBackground1} 0%, transparent 70%)
    `,
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
  },
  iconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: tokens.shadow4,
  },
  brandIcon: {
    width: '52px',
    height: '52px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'block',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
  intro: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  featureIcon: {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  featureTitle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  featureBody: {
    color: tokens.colorNeutralForeground3,
  },
  signInButton: {
    width: '100%',
  },
  demoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
  demoLine: {
    flex: '1 1 auto',
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  footnote: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    icon: <Eye20Regular />,
    title: 'Read mode by default',
    body: 'You start with read-only access. No accidental changes.',
  },
  {
    icon: <ShieldCheckmark20Regular />,
    title: 'Delegated permissions only',
    body: 'Your account and Entra roles determine what you can do.',
  },
  {
    icon: <Cloud20Regular />,
    title: 'Browser-only, no backend',
    body: 'Tenant data stays in your browser session — never stored server-side.',
  },
];

export function AuthGate({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { instance } = useMsal();
  const { isDemo, enterDemo } = useDemo();

  // Demo mode bypasses Microsoft Entra entirely and renders the app against the
  // simulated tenant.
  if (isDemo) return <>{children}</>;

  return (
    <>
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <div className={styles.root}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.iconWrap}>
                <img
                  src="/favicon.svg"
                  alt=""
                  aria-hidden="true"
                  className={styles.brandIcon}
                />
              </div>
              <div className={styles.titleBlock}>
                <Title2>Entra Extensions Manager</Title2>
                <Subtitle2 className={styles.subtitle}>
                  Manage Entra schema &amp; directory extensions
                </Subtitle2>
              </div>
            </div>

            <Body1 className={styles.intro}>
              Sign in with a Microsoft Entra ID account that has permission to
              read the directory schema. You can elevate to <strong>Edit mode</strong>{' '}
              later if you need to make changes — Entra will prompt for additional
              consent at that point.
            </Body1>

            <Divider />

            <ul className={styles.featureList}>
              {features.map((feature) => (
                <li key={feature.title} className={styles.featureItem}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <div className={styles.featureText}>
                    <Body1 className={styles.featureTitle}>{feature.title}</Body1>
                    <Caption1 className={styles.featureBody}>{feature.body}</Caption1>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              appearance="primary"
              size="large"
              className={styles.signInButton}
              onClick={() => instance.loginRedirect(loginRequest).catch(console.error)}
            >
              Sign in with Microsoft Entra
            </Button>

            <div className={styles.demoRow}>
              <span className={styles.demoLine} />
              <Caption1>or</Caption1>
              <span className={styles.demoLine} />
            </div>

            <Button
              appearance="secondary"
              size="large"
              className={styles.signInButton}
              icon={<Beaker20Regular />}
              onClick={enterDemo}
            >
              Explore the live demo
            </Button>

            <Caption1 className={styles.footnote}>
              No sign-in required — browse a fully simulated tenant with sample
              extensions, usage and audit data. Nothing is sent to Microsoft
              Graph.
            </Caption1>

            <Caption1 className={styles.footnote}>
              By signing in you agree to your organization&rsquo;s policies. MFA
              and Conditional Access still apply.
            </Caption1>
          </div>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
}
