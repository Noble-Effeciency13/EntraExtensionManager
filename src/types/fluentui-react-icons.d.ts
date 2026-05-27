// The published @fluentui/react-icons (v2.0.328) does not ship .d.ts files for its
// barrel export. Declare the module as `any` so named icon imports type-check.
// (Setting skipLibCheck alone is not enough because the package's `typings`
// field points at a file that isn't shipped.)
declare module '@fluentui/react-icons';
