import { useRouter } from 'expo-router';

import { EmptyState, Page } from '@/components/mobile-ui';
import { replaceRoute } from '@/lib/navigation';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Page backgroundColor={LIGHT_PAGE_BG} contentStyle={styles.page}>
      <EmptyState
        title="Oops! Page not found"
        subtitle="The link you followed may be broken or the page may have been removed."
        actionLabel="Go back home"
        onAction={() => replaceRoute(router, '/')}
      />
    </Page>
  );
}

const LIGHT_PAGE_BG = '#f6f7fb';

const styles = {
  page: {
    padding: 16,
    paddingBottom: 28,
  },
};
