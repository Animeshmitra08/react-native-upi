import { NativeModule, requireNativeModule } from 'expo';

import type { UpiApp, UpiPaymentRequest, UpiPaymentResult } from './ReactNativeUpi.types';

declare class ReactNativeUpiModule extends NativeModule<{}> {
  getInstalledUpiApps(): UpiApp[];
  isUpiAppInstalled(packageName: string): boolean;
  buildUpiUri(request: UpiPaymentRequest): string;
  pay(request: UpiPaymentRequest): Promise<UpiPaymentResult>;
}

const ReactNativeUpi = requireNativeModule<ReactNativeUpiModule>('ReactNativeUpi');

/** Returns the UPI apps installed on the device. */
export function getInstalledUpiApps(): UpiApp[] {
  return ReactNativeUpi.getInstalledUpiApps();
}

/** Returns true if the given app is installed and can handle UPI payments. */
export function isUpiAppInstalled(packageName: string): boolean {
  return ReactNativeUpi.isUpiAppInstalled(packageName);
}

/** Returns the exact UPI URI `pay()` would send, without opening any app. Useful for debugging. */
export function buildUpiUri(request: UpiPaymentRequest): string {
  return ReactNativeUpi.buildUpiUri(request);
}

/** Opens a UPI app to make the payment and resolves with the result. */
export function pay(request: UpiPaymentRequest): Promise<UpiPaymentResult> {
  return ReactNativeUpi.pay(request);
}

export default ReactNativeUpi;
