/**
 * Package names of popular UPI apps, for use with `pay({ app })` and `isUpiAppInstalled()`.
 * Any other UPI app's package name works too.
 */
export const UpiApps = {
  GOOGLE_PAY: 'com.google.android.apps.nbu.paisa.user',
  PHONEPE: 'com.phonepe.app',
  PAYTM: 'net.one97.paytm',
  BHIM: 'in.org.npci.upiapp',
  AMAZON_PAY: 'in.amazon.mShop.android.shopping',
  CRED: 'com.dreamplug.androidapp',
} as const;

export type UpiApp = {
  packageName: string;
  name: string;
};

/**
 * A personal (P2P) UPI payment. Sent as:
 * `upi://pay?pa=<pa>&pn=<pn>&am=<amount>&cu=INR`
 */
export type UpiPaymentRequest = {
  /** Payee UPI ID (VPA), e.g. `name@okaxis`. */
  pa: string;
  /** Payee name. */
  pn: string;
  /** Amount in INR, e.g. `"1.00"`. Normalized to 2 decimals. */
  amount: string;
  /** Package name of the UPI app to open. When omitted, Android's app chooser is shown. */
  app?: string;
  /** Title of the app chooser. Defaults to "Pay with". */
  chooserTitle?: string;
};

export type UpiPaymentResult = {
  status: 'SUCCESS' | 'FAILURE' | 'SUBMITTED' | 'CANCELLED' | 'UNKNOWN';
  /** The exact UPI URI that was sent to the UPI app. */
  uri?: string | null;
  response?: string | null;
  approvalRefNo?: string | null;
  txnRef?: string | null;
  txnId?: string | null;
  code?: string | null;
  resultCode?: number;
  responseData?: string | null;
};
