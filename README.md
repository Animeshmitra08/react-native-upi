# react-native-upi

Send UPI payments to a **personal UPI ID** through **any UPI app** (Google Pay, PhonePe, Paytm, BHIM and others) in React Native and Expo apps on Android.

This is an [Expo module](https://docs.expo.dev/modules/overview/). It opens a UPI app with a standard `upi://pay` intent and returns the payment result to your JavaScript code.

Every payment is sent as a plain personal (P2P) UPI URI:

```
upi://pay?pa=test@upi&pn=Test&am=1.00&cu=INR
```

## Platform support

| Platform | Supported |
| -------- | --------- |
| Android  | ✅        |
| iOS      | ❌        |
| Web      | ❌ (`getInstalledUpiApps()` returns `[]`, `isUpiAppInstalled()` returns `false`, `pay()` and `buildUpiUri()` throw) |

## Requirements

- Expo SDK with a [development build](https://docs.expo.dev/develop/development-builds/introduction/) or a bare React Native app with [Expo modules installed](https://docs.expo.dev/bare/installing-expo-modules/).
- **Expo Go is not supported**, because this module contains custom native code.
- A real Android device with at least one UPI app installed. UPI apps do not make payments on emulators.

## Installation

```sh
npx expo install react-native-upi
```

Then rebuild the native app:

```sh
npx expo prebuild
npx expo run:android
```

The module's `AndroidManifest.xml` adds the `<queries>` entry that Android 11 and later need to detect and open UPI apps. It is merged into your app automatically, so no manual manifest changes are needed.

## Usage

### Make a payment

```tsx
import { pay } from 'react-native-upi';

const result = await pay({
  pa: 'friend@okhdfcbank',
  pn: 'Friend Name',
  amount: '1.00',
});
```

No `app` is given, so Android shows a chooser and the user picks which UPI app to pay with.

### Open a specific UPI app

```tsx
import { isUpiAppInstalled, pay, UpiApps } from 'react-native-upi';

if (isUpiAppInstalled(UpiApps.PHONEPE)) {
  const result = await pay({
    pa: 'friend@ybl',
    pn: 'Friend Name',
    amount: '1.00',
    app: UpiApps.PHONEPE,
  });
}
```

### Let the user pick from installed UPI apps

```tsx
import { getInstalledUpiApps } from 'react-native-upi';

const apps = getInstalledUpiApps();
// [{ packageName: 'com.google.android.apps.nbu.paisa.user', name: 'Google Pay' },
//  { packageName: 'com.phonepe.app', name: 'PhonePe' }, ...]
```

Show these in your own UI, then pass the selected `packageName` as `app` to `pay()`.

### Handle the result

```tsx
try {
  const result = await pay(request);

  switch (result.status) {
    case 'SUCCESS':
      console.log('Paid, transaction ID:', result.txnId);
      break;
    case 'SUBMITTED':
      console.log('Payment pending, confirm it with the payee');
      break;
    case 'CANCELLED':
      console.log('User cancelled the payment');
      break;
    default:
      console.log('Payment failed or unknown:', result);
  }
} catch (error: any) {
  console.error(error.code, error.message);
}
```

## Debugging

To see exactly what your app sends to the UPI app, use any of these:

**1. Preview the URI before paying.** `buildUpiUri()` returns the exact URI that `pay()` would send, without opening any app. It uses the same validation as `pay()`, so it throws the same errors.

```tsx
import { buildUpiUri } from 'react-native-upi';

console.log(buildUpiUri({ pa: 'test@upi', pn: 'Test', amount: '1' }));
// upi://pay?pa=test@upi&pn=Test&am=1.00&cu=INR
```

**2. Read it from the result.** Every `pay()` result includes the `uri` that was sent, next to the raw `response` from the UPI app.

```tsx
const result = await pay(request);
console.log('Sent:', result.uri);
console.log('UPI app replied:', result.response);
```

**3. Check logcat.** The module logs the URI before launching the UPI app, and the raw result when it returns, under the `ReactNativeUpi` tag:

```sh
adb logcat -s ReactNativeUpi
```

```
D ReactNativeUpi: Launching UPI intent: upi://pay?pa=test@upi&pn=Test&am=1.00&cu=INR
D ReactNativeUpi: UPI result: resultCode=-1, response=txnId=...&responseCode=00&Status=SUCCESS&txnRef=...
```

**Test without the module.** To check whether a failure comes from the UPI app rather than your code, send the same URI straight from your computer:

```sh
adb shell am start -a android.intent.action.VIEW -d "upi://pay?pa=test@upi\&pn=Test\&am=1.00\&cu=INR"
```

If the UPI app shows the same error, the problem is not in this module.

## API

### `pay(request: UpiPaymentRequest): Promise<UpiPaymentResult>`

Opens a UPI app with the payment details. The promise resolves when the user returns to your app.

### `buildUpiUri(request: UpiPaymentRequest): string`

Returns the exact UPI URI that `pay()` would send, without opening any app.

### `getInstalledUpiApps(): UpiApp[]`

Returns the UPI apps installed on the device, as `{ packageName, name }` objects.

### `isUpiAppInstalled(packageName: string): boolean`

Returns `true` if the app is installed and can handle UPI payments.

### `UpiApps`

Package names of popular UPI apps. You can also pass any other UPI app's package name.

| Constant               | Package name |
| ---------------------- | ------------ |
| `UpiApps.GOOGLE_PAY`   | `com.google.android.apps.nbu.paisa.user` |
| `UpiApps.PHONEPE`      | `com.phonepe.app` |
| `UpiApps.PAYTM`        | `net.one97.paytm` |
| `UpiApps.BHIM`         | `in.org.npci.upiapp` |
| `UpiApps.AMAZON_PAY`   | `in.amazon.mShop.android.shopping` |
| `UpiApps.CRED`         | `com.dreamplug.androidapp` |

### `UpiPaymentRequest`

| Field          | Type     | Required | UPI param | Description |
| -------------- | -------- | -------- | --------- | ----------- |
| `pa`           | `string` | Yes      | `pa`      | Payee UPI ID (VPA), e.g. `name@okaxis`. |
| `pn`           | `string` | Yes      | `pn`      | Payee name. |
| `amount`       | `string` | Yes      | `am`      | Amount in INR. Must be positive with at most 2 decimals. `"1"` is sent as `"1.00"`. |
| `app`          | `string` | No       |           | Package name of the UPI app to open. If omitted, Android's app chooser is shown. |
| `chooserTitle` | `string` | No       |           | Title of the app chooser. Defaults to `"Pay with"`. |

The currency is always `INR` (`cu=INR`). The `@` in `pa` is sent as-is. Other special characters, such as spaces in `pn`, are percent-encoded (`Test Name` becomes `Test%20Name`).

### `UpiPaymentResult`

| Field           | Type             | Description |
| --------------- | ---------------- | ----------- |
| `status`        | `'SUCCESS' \| 'FAILURE' \| 'SUBMITTED' \| 'CANCELLED' \| 'UNKNOWN'` | Normalized payment status. |
| `uri`           | `string \| null` | The exact UPI URI that was sent to the UPI app. |
| `response`      | `string \| null` | Raw response string returned by the UPI app, e.g. `txnId=...&responseCode=00&Status=SUCCESS&txnRef=...`. |
| `txnId`         | `string \| null` | UPI transaction ID. |
| `txnRef`        | `string \| null` | Transaction reference returned by the UPI app. |
| `approvalRefNo` | `string \| null` | Bank approval reference number. |
| `code`          | `string \| null` | UPI response code (`responseCode`). |
| `resultCode`    | `number`         | Android activity result code. |
| `responseData`  | `string \| null` | Data URI returned with the result, if any. |

**Status values:**

- `SUCCESS`: the payment went through.
- `FAILURE`: the payment failed.
- `SUBMITTED`: the payment is pending.
- `CANCELLED`: the user closed the UPI app without paying.
- `UNKNOWN`: the UPI app returned a response the module could not interpret. Check `response`.

### Errors

`pay()` rejects, and `buildUpiUri()` throws, with one of these error codes:

| Code                    | When |
| ----------------------- | ---- |
| `INVALID_PAYEE`         | `pa` or `pn` is empty. |
| `INVALID_AMOUNT`        | `amount` is not a positive number, or has more than 2 decimals. |
| `NO_UPI_APP`            | No UPI app is installed on the device. (`pay()` only) |
| `UPI_APP_NOT_INSTALLED` | The app given in `app` is not installed or does not support UPI. (`pay()` only) |
| `PAYMENT_IN_PROGRESS`   | `pay()` was called while another payment was still open. (`pay()` only) |
| `NO_ACTIVITY`           | No Android activity is available to launch the UPI app from. (`pay()` only) |
| `PAYMENT_START_FAILED`  | Android could not start the UPI intent. (`pay()` only) |

## Important notes

- **UPI apps may block payments started from other apps.** Many UPI apps, Google Pay in particular, decline personal payments that another app starts through an intent. No money is debited when this happens. The error can be misleading, for example "You have exceeded the bank limit for this payment" or "declined for security reasons", even for ₹1. This is a restriction inside the UPI app and cannot be fixed in code. Leave `app` empty so the user can pick an app that allows it, and use the [debugging tools](#debugging) to confirm the URI is correct.
- **Don't treat the result as proof of payment.** The result comes from the user's device and can be tampered with. If money or goods depend on it, confirm the transaction with the payee or their bank using `txnId`.
- **The chosen app is not reported.** When the user picks from the chooser, the result does not say which app they used.

## Example app

The [`example`](./example) folder contains a sample app. It shows a live preview of the UPI URI as you type, and lets you pick a UPI app or the chooser. To run it on a connected Android device:

```sh
cd example
npm install
npx expo run:android
```

## License

MIT
