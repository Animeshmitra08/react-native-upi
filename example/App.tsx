import { useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  buildUpiUri,
  getInstalledUpiApps,
  pay,
  UpiApp,
  UpiPaymentRequest,
} from 'react-native-upi';

export default function App() {
  const [pa, setPa] = useState('');
  const [pn, setPn] = useState('');
  const [amount, setAmount] = useState('1.00');
  const [apps, setApps] = useState<UpiApp[]>(() => getInstalledUpiApps());
  // null = show Android's UPI app chooser
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  const request: UpiPaymentRequest = {
    pa,
    pn,
    amount,
    app: selectedApp ?? undefined,
  };

  // Preview of the exact URI that will be sent to the UPI app.
  // null when the payment details are invalid.
  let upiUri: string | null = null;
  let uriPreview: string;
  try {
    upiUri = buildUpiUri(request);
    uriPreview = upiUri;
  } catch (error) {
    uriPreview = error instanceof Error ? error.message : String(error);
  }

  const startPayment = async () => {
    try {
      setResult('Opening UPI app...');

      const paymentResult = await pay(request);

      console.log('Payment result:', paymentResult);

      setResult(
        JSON.stringify(paymentResult, null, 2)
      );

      // UPI apps often block app-to-app payments to personal UPI IDs.
      // Fall back to a QR code the payer can scan from their UPI app.
      // SUBMITTED is skipped because the payment may still go through.
      if (paymentResult.status === 'SUCCESS' || paymentResult.status === 'SUBMITTED') {
        setShowQr(false);
      } else {
        setShowQr(true);
      }
    } catch (error) {
      console.error('Payment failed:', error);

      // Native rejections carry a code such as NO_UPI_APP, UPI_APP_NOT_INSTALLED,
      // INVALID_PAYEE, INVALID_AMOUNT or PAYMENT_IN_PROGRESS.
      const code = (error as { code?: string })?.code;
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      setResult(code ? `${code}: ${message}` : message);

      // e.g. NO_UPI_APP: the payer can still scan the QR from another phone.
      setShowQr(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          UPI Payment Test
        </Text>

        <Text style={styles.sectionTitle}>Payment details</Text>
        <TextInput style={styles.input} value={pa} onChangeText={setPa} placeholder="Payee UPI ID (e.g. name@okaxis)" autoCapitalize="none" />
        <Text style={styles.hint}>
          Tip: UPI apps often decline payments to a personal UPI ID with "declined for security
          reasons" or "exceeded the bank limit". A business UPI ID (Paytm for Business, PhonePe
          Business, BharatPe) works more reliably and still pays into your bank account.
        </Text>
        <TextInput style={styles.input} value={pn} onChangeText={setPn} placeholder="Payee name" />
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad" />

        <Text style={styles.sectionTitle}>UPI URI</Text>
        <Text style={styles.uri} selectable>{uriPreview}</Text>

        <Text style={styles.sectionTitle}>UPI app</Text>
        <View style={styles.wrap}>
          <Choice label="Ask every time" selected={selectedApp === null} onPress={() => setSelectedApp(null)} />
          {apps.map((app) => (
            <Choice
              key={app.packageName}
              label={app.name}
              selected={selectedApp === app.packageName}
              onPress={() => setSelectedApp(app.packageName)}
            />
          ))}
        </View>
        {apps.length === 0 && <Text style={styles.hint}>No UPI apps found on this device.</Text>}
        <View style={styles.button}>
          <Button title="Refresh UPI apps" onPress={() => setApps(getInstalledUpiApps())} />
        </View>

        <View style={styles.button}>
          <Button
            title={`Pay ₹${amount || '0'}`}
            onPress={startPayment}
            disabled={!pa || !pn || !amount}
          />
        </View>

        <View style={styles.button}>
          <Button
            title={showQr ? 'Hide QR code' : 'Show QR code'}
            onPress={() => setShowQr(!showQr)}
            disabled={!upiUri}
          />
        </View>

        {showQr && upiUri && (
          <View style={styles.qrContainer}>
            <Text style={styles.sectionTitle}>Scan to pay</Text>
            <QRCode value={upiUri} size={220} />
            <Text style={styles.hint}>
              Open any UPI app on the payer's phone, choose "Scan QR" and scan this code.
            </Text>
          </View>
        )}

        <Text style={styles.resultTitle}>
          Result
        </Text>

        <Text style={styles.result}>
          {result || 'No payment attempted yet'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice(props: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={props.onPress}
      style={[styles.choice, props.selected && styles.choiceSelected]}
    >
      {props.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    padding: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  uri: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f2f2f2',
    padding: 10,
  },

  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  choice: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#999',
    color: '#333',
  },

  choiceSelected: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
    color: '#fff',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },

  hint: {
    color: '#777',
    marginBottom: 8,
  },

  button: {
    marginTop: 8,
    marginBottom: 8,
  },

  qrContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },

  result: {
    fontSize: 14,
    backgroundColor: '#f2f2f2',
    padding: 16,
  },
});
