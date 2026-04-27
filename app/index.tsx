import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#f9fafb',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  green: '#16a34a',
  greenLight: '#22c55e',
  greenSoft: '#eaf7ee',
  orange: '#f97316',
  orangeSoft: '#fff1e6',
  purpleSoft: '#ede9fe',
  graySoft: '#f3f4f6',
};

const quickActions = [
  { icon: 'restaurant-outline' as const, title: 'Browse Restaurants', accent: COLORS.green, tint: COLORS.greenSoft },
  { icon: 'clipboard-outline' as const, title: 'Track Orders', accent: '#6d28d9', tint: COLORS.purpleSoft },
  { icon: 'call-outline' as const, title: 'Contact Us', accent: COLORS.orange, tint: COLORS.orangeSoft },
];

const benefits = [
  {
    icon: 'card-outline' as const,
    title: 'Pay at restaurant',
    subtitle: 'No online payment',
    tint: COLORS.greenSoft,
    accent: COLORS.green,
  },
  {
    icon: 'bag-handle-outline' as const,
    title: 'Pickup when ready',
    subtitle: 'Fresh & on time',
    tint: COLORS.orangeSoft,
    accent: COLORS.orange,
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'No hidden fees',
    subtitle: 'What you see is what you pay',
    tint: '#e8f5e9',
    accent: '#15803d',
  },
];

const steps = [
  {
    number: '1',
    icon: 'search-outline' as const,
    title: 'Choose a Restaurant',
    subtitle: 'Browse nearby favorites and discover new spots.',
  },
  {
    number: '2',
    icon: 'cart-outline' as const,
    title: 'Place Your Order',
    subtitle: 'Customize in seconds. Every detail saved to your cart.',
  },
  {
    number: '3',
    icon: 'bag-check-outline' as const,
    title: 'Pick Up & Pay',
    subtitle: 'We update you when the kitchen starts and finishes.',
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>
            Go<Text style={styles.brandAccent}>2</Text>Pik
          </Text>

          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={styles.avatarButton}>
              <Text style={styles.avatarText}>G</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowLeft} />
          <View style={styles.heroGlowRight} />

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Craving something?</Text>
            <Text style={styles.heroSubtitle}>
              We&apos;ll have it <Text style={styles.heroAccent}>ready</Text>
              {'\n'}
              before you arrive.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/home')}
              style={styles.heroButton}
            >
              <Text style={styles.heroButtonText}>Start Ordering</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </Pressable>

            <View style={styles.heroNoteRow}>
              <View style={styles.heroNoteIcon}>
                <Ionicons name="checkmark" size={14} color={COLORS.green} />
              </View>
              <Text style={styles.heroNote}>Pickup-only. No delivery fees.</Text>
            </View>
          </View>

          <View style={styles.heroArt} pointerEvents="none">
            <View style={styles.heroBagShadow} />
            <View style={styles.heroBag}>
              <View style={styles.heroBagFold} />
              <View style={styles.heroBagSide} />
              <View style={styles.heroBagLogoRow}>
                <Text style={styles.heroBagLogo}>
                  Go<Text style={styles.heroBagLogoAccent}>2</Text>Pik
                </Text>
              </View>
            </View>

            <View style={styles.bowlOne} />
            <View style={styles.bowlTwo} />
            <View style={styles.bowlOneContents} />
            <View style={styles.bowlTwoContents} />
            <View style={styles.steamLeft} />
            <View style={styles.steamCenter} />
            <View style={styles.steamRight} />
            <View style={styles.sparkOne} />
            <View style={styles.sparkTwo} />
            <View style={styles.sparkThree} />
          </View>
        </View>

        <View style={styles.sectionRow}>
          {quickActions.map((item) => (
            <QuickActionCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              accent={item.accent}
              tint={item.tint}
              onPress={() => {
                if (item.title === 'Track Orders') {
                  router.push('/orders');
                  return;
                }

                router.push('/home');
              }}
            />
          ))}
        </View>

        <View style={styles.benefitCard}>
          {benefits.map((item, index) => (
            <View key={item.title} style={[styles.benefitItem, index < benefits.length - 1 && styles.benefitDivider]}>
              <View style={[styles.benefitIconWrap, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={22} color={item.accent} />
              </View>
              <Text style={styles.benefitTitle}>{item.title}</Text>
              <Text style={styles.benefitSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.howCard}>
          <Text style={styles.sectionEyebrow}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Three simple steps to your next great meal</Text>

          <View style={styles.stepsRow}>
            {steps.map((step, index) => (
              <View key={step.title} style={[styles.stepItem, index < steps.length - 1 && styles.stepDivider]}>
                <View style={styles.stepTopRow}>
                  <View style={styles.stepNumberBubble}>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                  <View style={styles.stepIconBubble}>
                    <Ionicons name={step.icon} size={26} color={COLORS.green} />
                  </View>
                </View>

                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            Go<Text style={styles.footerBrandAccent}>2</Text>Pik
          </Text>
          <Text style={styles.footerFinePrint}>Go2Pik is a service provided by EHA Technologies</Text>
          <View style={styles.footerLinks}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.footerSeparator}>|</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/terms')}>
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
            <Text style={styles.footerSeparator}>|</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Contact</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickActionCard({
  icon,
  title,
  accent,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  accent: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickCard}>
      <View style={[styles.quickIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <View style={[styles.quickChevronWrap, { backgroundColor: tint }]}>
        <Ionicons name="chevron-forward" size={16} color={accent} />
      </View>
    </Pressable>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  brand: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  brandAccent: {
    color: COLORS.orange,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    shadowColor: '#14532d',
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroCard: {
    minHeight: 356,
    borderRadius: CARD_RADIUS,
    padding: 14,
    overflow: 'hidden',
    backgroundColor: '#050505',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 5,
  },
  heroGlowLeft: {
    position: 'absolute',
    left: -34,
    top: -26,
    width: 190,
    height: 190,
    borderRadius: 190,
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  heroGlowRight: {
    position: 'absolute',
    right: -40,
    bottom: -60,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  heroCopy: {
    width: '56%',
    gap: 10,
    zIndex: 2,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: COLORS.white,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroAccent: {
    color: COLORS.orange,
  },
  heroButton: {
    height: 62,
    borderRadius: 17,
    backgroundColor: COLORS.greenLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    shadowColor: '#14532d',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  heroButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  heroNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
  },
  heroNoteIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNote: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  heroArt: {
    position: 'absolute',
    right: 8,
    top: 12,
    width: '50%',
    height: 322,
  },
  heroBagShadow: {
    position: 'absolute',
    right: 10,
    bottom: 26,
    width: 124,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    opacity: 0.4,
  },
  heroBag: {
    position: 'absolute',
    right: 6,
    top: 26,
    width: 132,
    height: 168,
    borderRadius: 10,
    backgroundColor: '#f4eadf',
    borderWidth: 1,
    borderColor: '#d8c0a6',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 5,
  },
  heroBagFold: {
    position: 'absolute',
    top: -12,
    left: 10,
    right: 10,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#fbf5ee',
    borderWidth: 1,
    borderColor: '#d8c0a6',
  },
  heroBagSide: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: '100%',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#e7d3be',
    opacity: 0.72,
  },
  heroBagLogoRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBagLogo: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroBagLogoAccent: {
    color: COLORS.orange,
  },
  bowlOne: {
    position: 'absolute',
    left: 10,
    bottom: 42,
    width: 126,
    height: 82,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 64,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: '#ead6bc',
    borderWidth: 1,
    borderColor: '#d7bf9f',
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  bowlTwo: {
    position: 'absolute',
    right: -2,
    bottom: 18,
    width: 128,
    height: 84,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 64,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: '#e6cfb4',
    borderWidth: 1,
    borderColor: '#d7bf9f',
    transform: [{ rotate: '2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  bowlOneContents: {
    position: 'absolute',
    left: 18,
    bottom: 66,
    width: 108,
    height: 34,
    borderRadius: 18,
    backgroundColor: '#d97706',
    opacity: 0.88,
  },
  bowlTwoContents: {
    position: 'absolute',
    right: 10,
    bottom: 42,
    width: 110,
    height: 34,
    borderRadius: 18,
    backgroundColor: '#ea580c',
    opacity: 0.88,
  },
  steamLeft: {
    position: 'absolute',
    left: 34,
    top: 98,
    width: 8,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.36)',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '8deg' }],
  },
  steamCenter: {
    position: 'absolute',
    left: 60,
    top: 86,
    width: 8,
    height: 70,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.36)',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '4deg' }],
  },
  steamRight: {
    position: 'absolute',
    left: 86,
    top: 96,
    width: 8,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.36)',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-6deg' }],
  },
  sparkOne: {
    position: 'absolute',
    right: 18,
    top: 58,
    width: 26,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.orange,
    transform: [{ rotate: '-66deg' }],
  },
  sparkTwo: {
    position: 'absolute',
    right: 22,
    top: 74,
    width: 20,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.orange,
    transform: [{ rotate: '-22deg' }],
  },
  sparkThree: {
    position: 'absolute',
    right: 6,
    top: 82,
    width: 18,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.orange,
    transform: [{ rotate: '18deg' }],
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  availableSection: {
    gap: 10,
  },
  availableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  availableEyebrow: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  availableCount: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  restaurantList: {
    gap: 10,
  },
  restaurantCardPressable: {
    borderRadius: CARD_RADIUS,
  },
  restaurantCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  restaurantCard: {
    gap: 8,
    padding: 12,
    borderRadius: CARD_RADIUS,
  },
  restaurantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  restaurantIdentity: {
    flex: 1,
    gap: 2,
  },
  restaurantName: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
  },
  restaurantCuisine: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  ratingText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  restaurantMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  restaurantEta: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  metaDot: {
    color: COLORS.muted,
    fontWeight: '900',
  },
  restaurantAddressWrap: {
    flex: 1,
    gap: 2,
  },
  restaurantAddressLine: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 16,
  },
  restaurantAddressSecondary: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  restaurantPreview: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  restaurantMenuPreviewRow: {
    gap: 4,
  },
  restaurantMenuPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  restaurantMenuPreviewName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  restaurantMenuPreviewPrice: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  restaurantMenuPreviewEmpty: {
    color: COLORS.muted,
    fontSize: 12,
  },
  quickCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 3,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  quickChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  trustOverlap: {
    marginLeft: -12,
  },
  trustAvatarText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  countBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  countBubbleText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },
  trustText: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  trustAccent: {
    color: COLORS.green,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 3,
  },
  benefitItem: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  benefitIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  benefitSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  howCard: {
    padding: 16,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#f7fbf6',
    borderWidth: 1,
    borderColor: '#e0eddc',
    gap: 10,
  },
  sectionEyebrow: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepItem: {
    flex: 1,
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  stepDivider: {
    borderRightWidth: 1,
    borderRightColor: '#dbe7d8',
  },
  stepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  stepIconBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#dbe7d8',
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stepSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#fff7ef',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: '#fde2c9',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 3,
  },
  emptyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe9d6',
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  retryButton: {
    minWidth: 118,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.orange,
    shadowColor: '#c2410c',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  footerBrand: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  footerBrandAccent: {
    color: COLORS.orange,
  },
  footerFinePrint: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  footerSeparator: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
});
