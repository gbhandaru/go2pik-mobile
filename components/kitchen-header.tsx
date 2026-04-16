import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/mobile-ui';

export function KitchenHeader({
  title,
  subtitle,
  restaurantName = 'Go2Pik Kitchen',
  onLogout,
  onRefresh,
  meta,
}: {
  title: string;
  subtitle?: string;
  restaurantName?: string;
  onLogout?: () => void;
  onRefresh?: () => void;
  meta?: string;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{restaurantName}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <View style={styles.actions}>
          {onRefresh ? (
            <Pressable onPress={onRefresh} style={styles.iconButton}>
              <Ionicons name="refresh" size={18} color="#f8fafc" />
            </Pressable>
          ) : null}
          {onLogout ? (
            <Pressable onPress={onLogout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={18} color="#f8fafc" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#fed7aa',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: '#9fb1ca',
    marginTop: 4,
    lineHeight: 20,
  },
  meta: {
    color: '#cbd5e1',
    marginTop: 6,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172338',
    borderWidth: 1,
    borderColor: 'rgba(159, 177, 202, 0.14)',
  },
});

