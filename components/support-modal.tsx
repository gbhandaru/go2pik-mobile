import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '@/components/mobile-ui';

export function SupportModal({
  visible,
  email,
  subject,
  body,
  onClose,
}: {
  visible: boolean;
  email: string;
  subject?: string;
  body?: string;
  onClose: () => void;
}) {
  const mailto = buildMailtoHref(email, subject, body);

  const handleEmail = async () => {
    await Linking.openURL(mailto);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4f9d69" />
            </View>
            <Text style={styles.eyebrow}>Contact</Text>
            <Text style={styles.title}>Need help?</Text>
            <Text style={styles.subtitle}>Reach the Go2Pik support team for order, account, or delivery issues.</Text>
          </View>

          <Card style={styles.emailCard}>
            <Text style={styles.emailLabel}>Support email</Text>
            <Text style={styles.email}>{email}</Text>
          </Card>

          <View style={styles.actions}>
            <Button title="Email support" onPress={() => void handleEmail()} style={styles.primaryAction} textStyle={styles.primaryActionText} />
            <Button title="Close" variant="ghost" onPress={onClose} style={styles.closeAction} textStyle={styles.closeActionText} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildMailtoHref(email: string, subject = '', body = '') {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f6f7fb',
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
  },
  header: {
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#eaf5ee',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#475569',
    lineHeight: 20,
  },
  emailCard: {
    gap: 4,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  emailLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '800',
  },
  email: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  actions: {
    gap: 10,
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
  closeAction: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  closeActionText: {
    color: '#0f172a',
  },
});
