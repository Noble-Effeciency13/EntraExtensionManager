/**
 * Seeded, in-memory dataset that backs the portal's demo mode. No network or
 * Microsoft Graph calls are made while demo mode is active — every read and
 * write is served from (and mutated against) this store, so creating, editing,
 * assigning and deleting extensions all behave like a real tenant for the
 * duration of the browser tab session.
 *
 * The store is re-seeded from scratch each time the user enters demo mode (see
 * `resetDemoStore`), so a session always starts from the same clean fixture.
 */
import type {
  DirectoryExtensionProperty,
  SchemaExtension,
} from '@/types/extensions';

export interface DemoTenant {
  tenantId: string;
  displayName: string;
  defaultDomain: string;
  tenantCategory: string;
}

export interface DemoAccount {
  name: string;
  username: string;
  tenantId: string;
  localAccountId: string;
}

/** A raw open-extension object as Graph would return it on a resource. */
export type DemoOpenExtension = Record<string, unknown> & {
  '@odata.type': string;
  id: string;
  extensionName: string;
};

/** A directory object (user/group/device/AU/org) in the simulated tenant. */
export interface DemoObject {
  id: string;
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  mailNickname?: string;
  deviceId?: string;
  appId?: string;
  /**
   * Extension values carried by this object, keyed by schema-extension id
   * (value is an object of property values) or by the fully-qualified
   * directory-extension name (value is a scalar).
   */
  values: Record<string, unknown>;
  /** Open extensions (Microsoft.Graph.openTypeExtension) stored on the object. */
  extensions: DemoOpenExtension[];
}

export interface DemoApp {
  id: string;
  appId: string;
  displayName: string;
  extensionProperties: DirectoryExtensionProperty[];
}

export interface DemoAuditEntry {
  id: string;
  activityDateTime: string;
  activityDisplayName: string;
  category: string;
  result: string;
  initiatedBy?: { user?: { userPrincipalName?: string; displayName?: string } };
  targetResources?: Array<{ id?: string; displayName?: string; type?: string }>;
}

export interface DemoStore {
  account: DemoAccount;
  tenants: DemoTenant[];
  schemaExtensions: SchemaExtension[];
  apps: DemoApp[];
  directory: {
    users: DemoObject[];
    groups: DemoObject[];
    devices: DemoObject[];
    applications: DemoObject[];
    administrativeUnits: DemoObject[];
    organization: DemoObject[];
  };
  audit: DemoAuditEntry[];
}

const APP_HR = '11111111-1111-1111-1111-111111111111';
const APP_LEARN = '22222222-2222-2222-2222-222222222222';
const APP_ASSET = '33333333-3333-3333-3333-333333333333';
const APP_HELPDESK = '44444444-4444-4444-4444-444444444444';

const DEMO_TENANT_ID = 'a1b2c3d4-0000-4a5b-8c9d-100000000001';

export const DEMO_ACCOUNT: DemoAccount = {
  name: 'Demo Admin',
  username: 'admin@contoso.demo',
  tenantId: DEMO_TENANT_ID,
  localAccountId: 'demo-admin-0001',
};

export const DEMO_TENANTS: DemoTenant[] = [
  {
    tenantId: DEMO_TENANT_ID,
    displayName: 'Contoso (Demo)',
    defaultDomain: 'contoso.onmicrosoft.com',
    tenantCategory: 'Home',
  },
  {
    tenantId: 'a1b2c3d4-0000-4a5b-8c9d-100000000002',
    displayName: 'Fabrikam (Demo)',
    defaultDomain: 'fabrikam.onmicrosoft.com',
    tenantCategory: 'Guest',
  },
];

/** Build a fully-qualified directory extension name from an appId + short name. */
function dirExtName(appId: string, name: string): string {
  return `extension_${appId.replace(/-/g, '')}_${name}`;
}

const HR_REGION = dirExtName(APP_HR, 'employeeRegion');
const HR_COSTCENTER = dirExtName(APP_HR, 'costCenterCode');
const ASSET_CLASS = dirExtName(APP_ASSET, 'deviceClass');

/** ISO timestamp `days` days before now (UTC). */
function iso(daysAgo: number, hour = 9): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 15, 0, 0);
  return d.toISOString();
}

/** Construct a fresh copy of the demo fixture. */
function seed(): DemoStore {
  const schemaExtensions: SchemaExtension[] = [
    {
      id: 'extlearn01_courses',
      description: 'Training courses completed by the user.',
      targetTypes: ['User', 'Group'],
      properties: [
        { name: 'courseId', type: 'Integer' },
        { name: 'courseName', type: 'String' },
        { name: 'completedOn', type: 'DateTime' },
      ],
      status: 'Available',
      owner: APP_LEARN,
    },
    {
      id: 'exthr03_employeeProfile',
      description: 'Extended HR profile attributes synced from Workday.',
      targetTypes: ['User'],
      properties: [
        { name: 'costCenter', type: 'String' },
        { name: 'hireDate', type: 'DateTime' },
        { name: 'isManager', type: 'Boolean' },
      ],
      status: 'Available',
      owner: APP_HR,
    },
    {
      id: 'extasset02_assetTag',
      description: 'Hardware asset tag and purchase metadata.',
      targetTypes: ['Device'],
      properties: [
        { name: 'tag', type: 'String' },
        { name: 'purchasedOn', type: 'DateTime' },
      ],
      status: 'InDevelopment',
      owner: APP_ASSET,
    },
    {
      id: 'extproj04_project',
      description: 'Project metadata for collaboration groups.',
      targetTypes: ['Group'],
      properties: [
        { name: 'projectCode', type: 'String' },
        { name: 'budget', type: 'Integer' },
      ],
      status: 'Deprecated',
      owner: APP_LEARN,
    },
    {
      id: 'extsec06_clearance',
      description: 'Security clearance level and last review date.',
      targetTypes: ['User'],
      properties: [
        { name: 'level', type: 'Integer' },
        { name: 'reviewedOn', type: 'DateTime' },
      ],
      status: 'Available',
      owner: APP_ASSET,
    },
    {
      id: 'extevent05_eventInfo',
      description: 'Tagging metadata for calendar events and posts.',
      targetTypes: ['Event', 'Post', 'Message'],
      properties: [{ name: 'category', type: 'String' }],
      status: 'InDevelopment',
      owner: APP_HR,
    },
  ];

  const apps: DemoApp[] = [
    {
      id: 'app-obj-hr',
      appId: APP_HR,
      displayName: 'HR Sync Service',
      extensionProperties: [
        {
          id: 'dir-ext-region',
          name: HR_REGION,
          dataType: 'String',
          targetObjects: ['User'],
          isSyncedFromOnPremises: false,
        },
        {
          id: 'dir-ext-costcenter',
          name: HR_COSTCENTER,
          dataType: 'Integer',
          targetObjects: ['User', 'Group'],
          isSyncedFromOnPremises: true,
        },
      ],
    },
    {
      id: 'app-obj-asset',
      appId: APP_ASSET,
      displayName: 'Asset Tracker',
      extensionProperties: [
        {
          id: 'dir-ext-deviceclass',
          name: ASSET_CLASS,
          dataType: 'String',
          targetObjects: ['Device'],
          isSyncedFromOnPremises: false,
        },
      ],
    },
    {
      id: 'app-obj-learn',
      appId: APP_LEARN,
      displayName: 'Learning Portal',
      extensionProperties: [],
    },
    {
      id: 'app-obj-helpdesk',
      appId: APP_HELPDESK,
      displayName: 'Helpdesk Bot',
      extensionProperties: [],
    },
  ];

  const users: DemoObject[] = [
    {
      id: 'user-adele',
      displayName: 'Adele Vance',
      userPrincipalName: 'adele.vance@contoso.demo',
      mail: 'adele.vance@contoso.demo',
      values: {
        extlearn01_courses: {
          courseId: 1042,
          courseName: 'Microsoft Graph Fundamentals',
          completedOn: iso(40),
        },
        exthr03_employeeProfile: {
          costCenter: 'CC-1001',
          hireDate: iso(900),
          isManager: false,
        },
        [HR_REGION]: 'EMEA',
      },
      extensions: [
        {
          '@odata.type': '#microsoft.graph.openTypeExtension',
          id: 'com.contoso.roamingSettings',
          extensionName: 'com.contoso.roamingSettings',
          theme: 'dark',
          language: 'en-GB',
          fontSize: 14,
        },
      ],
    },
    {
      id: 'user-alex',
      displayName: 'Alex Wilber',
      userPrincipalName: 'alex.wilber@contoso.demo',
      mail: 'alex.wilber@contoso.demo',
      values: {
        extlearn01_courses: {
          courseId: 1080,
          courseName: 'Securing Identities',
          completedOn: iso(12),
        },
        extsec06_clearance: { level: 3, reviewedOn: iso(30) },
        [HR_REGION]: 'AMER',
      },
      extensions: [],
    },
    {
      id: 'user-megan',
      displayName: 'Megan Bowen',
      userPrincipalName: 'megan.bowen@contoso.demo',
      mail: 'megan.bowen@contoso.demo',
      values: {
        exthr03_employeeProfile: {
          costCenter: 'CC-2200',
          hireDate: iso(1500),
          isManager: true,
        },
        [HR_REGION]: 'APAC',
        [HR_COSTCENTER]: 2200,
      },
      extensions: [
        {
          '@odata.type': '#microsoft.graph.openTypeExtension',
          id: 'com.contoso.roamingSettings',
          extensionName: 'com.contoso.roamingSettings',
          theme: 'light',
          language: 'en-US',
          fontSize: 16,
        },
      ],
    },
    {
      id: 'user-lee',
      displayName: 'Lee Gu',
      userPrincipalName: 'lee.gu@contoso.demo',
      mail: 'lee.gu@contoso.demo',
      values: {
        extsec06_clearance: { level: 5, reviewedOn: iso(8) },
      },
      extensions: [],
    },
    {
      id: 'user-lynne',
      displayName: 'Lynne Robbins',
      userPrincipalName: 'lynne.robbins@contoso.demo',
      mail: 'lynne.robbins@contoso.demo',
      values: {
        extlearn01_courses: {
          courseId: 1099,
          courseName: 'Accessibility Essentials',
          completedOn: iso(3),
        },
      },
      extensions: [],
    },
  ];

  const groups: DemoObject[] = [
    {
      id: 'group-engineering',
      displayName: 'Engineering',
      mail: 'engineering@contoso.demo',
      mailNickname: 'engineering',
      values: {
        extproj04_project: { projectCode: 'ENG-PLATFORM', budget: 250000 },
        extlearn01_courses: {
          courseId: 2001,
          courseName: 'Team Onboarding',
          completedOn: iso(60),
        },
        [HR_COSTCENTER]: 3100,
      },
      extensions: [],
    },
    {
      id: 'group-marketing',
      displayName: 'Marketing',
      mail: 'marketing@contoso.demo',
      mailNickname: 'marketing',
      values: {
        extproj04_project: { projectCode: 'MKT-LAUNCH', budget: 90000 },
      },
      extensions: [],
    },
    {
      id: 'group-all-company',
      displayName: 'All Company',
      mail: 'all@contoso.demo',
      mailNickname: 'all',
      values: {},
      extensions: [
        {
          '@odata.type': '#microsoft.graph.openTypeExtension',
          id: 'com.contoso.groupSettings',
          extensionName: 'com.contoso.groupSettings',
          welcomeMessage: 'Welcome to Contoso!',
          autoSubscribe: true,
        },
      ],
    },
  ];

  const devices: DemoObject[] = [
    {
      id: 'device-laptop-001',
      displayName: 'LAPTOP-001',
      deviceId: 'd1000000-0000-4000-8000-000000000001',
      values: {
        extasset02_assetTag: { tag: 'AST-001', purchasedOn: iso(420) },
        [ASSET_CLASS]: 'Laptop',
      },
      extensions: [],
    },
    {
      id: 'device-kiosk-014',
      displayName: 'KIOSK-014',
      deviceId: 'd1000000-0000-4000-8000-000000000014',
      values: {
        extasset02_assetTag: { tag: 'AST-014', purchasedOn: iso(210) },
        [ASSET_CLASS]: 'Kiosk',
      },
      extensions: [],
    },
    {
      id: 'device-phone-220',
      displayName: 'PHONE-220',
      deviceId: 'd1000000-0000-4000-8000-000000000220',
      values: {
        [ASSET_CLASS]: 'Mobile',
      },
      extensions: [],
    },
  ];

  const administrativeUnits: DemoObject[] = [
    {
      id: 'au-seattle',
      displayName: 'Seattle HQ',
      values: {},
      extensions: [],
    },
    {
      id: 'au-emea',
      displayName: 'EMEA Region',
      values: {},
      extensions: [],
    },
  ];

  const organization: DemoObject[] = [
    {
      id: DEMO_TENANT_ID,
      displayName: 'Contoso (Demo)',
      values: {},
      extensions: [
        {
          '@odata.type': '#microsoft.graph.openTypeExtension',
          id: 'com.contoso.tenantBranding',
          extensionName: 'com.contoso.tenantBranding',
          primaryColor: '#0078d4',
          supportUrl: 'https://support.contoso.demo',
        },
      ],
    },
  ];

  const audit: DemoAuditEntry[] = [
    auditEntry(0, 'Add schema extension definition', 'extlearn01_courses', 'SchemaExtension'),
    auditEntry(1, 'Update schema extension definition', 'exthr03_employeeProfile', 'SchemaExtension'),
    auditEntry(2, 'Assign extension value', 'extlearn01_courses', 'User'),
    auditEntry(4, 'Add extension property', HR_REGION, 'ExtensionProperty'),
    auditEntry(6, 'Update schema extension status', 'extproj04_project', 'SchemaExtension'),
    auditEntry(7, 'Assign extension value', ASSET_CLASS, 'Device'),
    auditEntry(9, 'Add schema extension definition', 'extsec06_clearance', 'SchemaExtension'),
    auditEntry(11, 'Add extension property', HR_COSTCENTER, 'ExtensionProperty'),
    auditEntry(14, 'Add schema extension definition', 'extasset02_assetTag', 'SchemaExtension'),
    auditEntry(18, 'Delete schema extension definition', 'extold00_legacy', 'SchemaExtension'),
  ];

  return {
    account: DEMO_ACCOUNT,
    tenants: DEMO_TENANTS,
    schemaExtensions,
    apps,
    directory: {
      users,
      groups,
      devices,
      applications: [],
      administrativeUnits,
      organization,
    },
    audit,
  };
}

function auditEntry(
  daysAgo: number,
  activity: string,
  targetId: string,
  targetType: string,
): DemoAuditEntry {
  return {
    id: `audit-${targetId}-${daysAgo}`,
    activityDateTime: iso(daysAgo, 13),
    activityDisplayName: activity,
    category: targetType === 'SchemaExtension' ? 'ApplicationManagement' : 'DirectoryManagement',
    result: 'success',
    initiatedBy: {
      user: {
        userPrincipalName: DEMO_ACCOUNT.username,
        displayName: DEMO_ACCOUNT.name,
      },
    },
    targetResources: [{ id: targetId, displayName: targetId, type: targetType }],
  };
}

let store: DemoStore = seed();

/** Returns the live, mutable demo store. */
export function getDemoStore(): DemoStore {
  return store;
}

/** Re-seed the store to its pristine fixture (called when entering demo mode). */
export function resetDemoStore(): void {
  store = seed();
}
