import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Page } from '@/components/mobile-ui';
import { replaceRoute } from '@/lib/navigation';

const termsPoints = [
  'By providing your phone number, you agree to receive SMS messages related to your order and account.',
  'You can reply STOP at any time to opt out of future text messages.',
  'You can reply HELP for assistance with messaging or your order.',
  'Message frequency may vary based on order activity and account updates. Message and data rates may apply.',
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} scroll={false}>
      <ScrollView contentContainerStyle={styles.page}>
        <Card style={styles.card}>
          <Text style={styles.eyebrow}>Terms & Conditions</Text>
          <Text style={styles.title}>SMS consent and messaging terms</Text>
          <Text style={styles.lede}>
            Go2Pik is a service provided by EHA Technologies. These Terms govern your use of the Go2Pik platform.
          </Text>
          {termsPoints.map((point) => (
            <Text key={point} style={styles.listItem}>
              • {point}
            </Text>
          ))}
          <Text style={styles.note}>Message and data rates may apply.</Text>
          <Text style={styles.note}>Consent to receive SMS messages is not a condition of purchase.</Text>
          <Button title="Back to home" onPress={() => replaceRoute(router, '/')} style={styles.primaryAction} textStyle={styles.primaryActionText} />
          <Button title="View Privacy Policy" variant="secondary" onPress={() => replaceRoute(router, '/privacy')} style={styles.secondaryAction} textStyle={styles.secondaryActionText} />
        </Card>
      </ScrollView>
    </Page>
  );
}

const LIGHT_PAGE_BG = '#f6f7fb';

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  lede: {
    color: '#475569',
    lineHeight: 22,
  },
  listItem: {
    color: '#0f172a',
    lineHeight: 20,
  },
  note: {
    color: '#64748b',
    lineHeight: 20,
  },
  primaryAction: {
    backgroundColor: '#4f9d69',
  },
  primaryActionText: {
    color: '#ffffff',
  },
  secondaryAction: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  secondaryActionText: {
    color: '#0f172a',
  },
});
