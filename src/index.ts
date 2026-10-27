// Reexport the native module. On web, it will be resolved to ReactNativeUpiModule.web.ts
// and on native platforms to ReactNativeUpiModule.ts
export { buildUpiUri, getInstalledUpiApps, isUpiAppInstalled, pay } from './ReactNativeUpiModule';
export * from './ReactNativeUpi.types';
