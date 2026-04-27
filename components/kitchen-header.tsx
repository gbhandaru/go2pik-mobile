import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type KitchenHeaderProps = {
  title: string;
  subtitle?: string;
  restaurantName?: string;
  onLogout?: () => void;
  onRefresh?: () => void;
  primaryActionIcon?: 'refresh' | 'search';
  meta?: string;
  compact?: boolean;
  hideTitleBlock?: boolean;
};

export function KitchenHeader({
  title,
  subtitle,
  restaurantName = 'Go2Pik',
  onLogout,
  onRefresh,
  primaryActionIcon = 'refresh',
  meta,
  compact = false,
  hideTitleBlock = false,
}: KitchenHeaderProps) {
  const primaryIcon = primaryActionIcon === 'search' ? 'search-outline' : 'refresh-outline';

  return (
    <View style={[styles.shell, compact && styles.shellCompact]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Ionicons name="triangle-outline" size={16} color="#4f9d69" />
          <Text style={[styles.brand, compact && styles.brandCompact]}>{restaurantName}</Text>
        </View>

        <View style={styles.actions}>
          {onRefresh ? (
            <Pressable onPress={onRefresh} style={[styles.iconButton, compact && styles.iconButtonCompact]}>
              <Ionicons name={primaryIcon} size={16} color="#30543f" />
            </Pressable>
          ) : null}
          {onLogout ? (
            <Pressable onPress={onLogout} style={[styles.iconButton, compact && styles.iconButtonCompact]}>
              <Ionicons name="log-out-outline" size={16} color="#30543f" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {hideTitleBlock ? null : (
        <View style={styles.titleBlock}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text> : null}
          {meta ? <Text style={[styles.meta, compact && styles.metaCompact]}>{meta}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 10,
  },
  shellCompact: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brand: {
    color: '#295638',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandCompact: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf5ef',
    borderWidth: 1,
    borderColor: '#d7e7da',
  },
  iconButtonCompact: {
    width: 30,
    height: 30,
  },
  titleBlock: {
    gap: 3,
  },
  title: {
    color: '#1f2937',
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '800',
  },
  titleCompact: {
    fontSize: 17,
    lineHeight: 20,
  },
  subtitle: {
    color: '#64748b',
    lineHeight: 18,
    fontSize: 13,
  },
  subtitleCompact: {
    fontSize: 12,
  },
  meta: {
    color: '#7a889c',
    fontSize: 11,
    fontWeight: '600',
  },
  metaCompact: {
    fontSize: 10,
  },
});
