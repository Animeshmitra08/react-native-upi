import { registerWebModule, NativeModule } from 'expo';

import type { UpiApp, UpiPaymentRequest, UpiPaymentResult } from './ReactNativeUpi.types';

// UPI intents only exist on Android, so web never has UPI apps available.
class ReactNativeUpiModule extends NativeModule<{}> {}

export function getInstalledUpiApps(): UpiApp[] {
  return [];
}

export function isUpiAppInstalled(_packageName: string): boolean {
  return false;
}

export function buildUpiUri(_request: UpiPaymentRequest): string {
  throw new Error('UPI payments are not supported on web');
}

export async function pay(_request: UpiPaymentRequest): Promise<UpiPaymentResult> {
  throw new Error('UPI payments are not supported on web');
}

export default registerWebModule(ReactNativeUpiModule, 'ReactNativeUpi');
