import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Page } from '@/components/mobile-ui';
import { replaceRoute } from '@/lib/navigation';

const policyPoints = [
  'We do not sell or share mobile numbers for marketing purposes.',
  'We use SMS to support order updates, pickup coordination, and order review.',
  'Message frequency may vary depending on your orders and account activity.',
  'Message and data rates may apply from your mobile carrier.',
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} scroll={false}>
      <ScrollView contentContainerStyle={styles.page}>
        <Card style={styles.card}>
          <Text style={styles.eyebrow}>Privacy Policy</Text>
          <Text style={styles.title}>SMS Privacy and Consent</Text>
          <Text style={styles.lede}>
            Go2Pik is a service provided by EHA Technologies. This Privacy Policy explains how we collect, use, and protect your information.
          </Text>
          <View style={styles.list}>
            {policyPoints.map((point) => (
              <Text key={point} style={styles.listItem}>
                • {point}
              </Text>
            ))}
          </View>
          <Text style={styles.note}>
            We only use your information to help complete your order, send relevant order messages, and support your account.
          </Text>
          <Text style={styles.sectionTitle}>SMS Consent and Mobile Information</Text>
          <Text style={styles.bodyText}>
            When you provide your mobile phone number and opt in to receive text messages from Go2Pik, we use your number only to send transactional messages related to your orders, such as order confirmations, order status updates, and pickup notifications.
          </Text>
          <Text style={styles.bodyText}>
            Mobile opt-in data and consent will not be shared with any third parties or affiliates for marketing or promotional purposes.
          </Text>
          <Text style={styles.bodyText}>
            Text messaging originator opt-in data and consent will not be shared with any third parties, excluding aggregators and service providers required to deliver the SMS messages.
          </Text>
          <Text style={styles.bodyText}>You can opt out of SMS messages at any time by replying STOP. For help, reply HELP.</Text>
          <View style={styles.actions}>
            <Button title="Back to home" onPress={() => replaceRoute(router, '/')} style={styles.primaryAction} textStyle={styles.primaryActionText} />
            <Button title="View Terms & Conditions" variant="secondary" onPress={() => replaceRoute(router, '/terms')} style={styles.secondaryAction} textStyle={styles.secondaryActionText} />
          </View>
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
  list: {
    gap: 8,
  },
  listItem: {
    color: '#0f172a',
    lineHeight: 20,
  },
  note: {
    color: '#64748b',
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  bodyText: {
    color: '#475569',
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    marginTop: 4,
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
