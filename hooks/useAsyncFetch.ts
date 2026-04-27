import { useEffect, useState } from 'react';

export function useAsyncFetch<T>(asyncFn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isActive = true;
    setState((prev) => ({ ...prev, loading: true }));

    async function run() {
      try {
        const data = await asyncFn();
        if (!isActive) return;
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Request failed';
        if (__DEV__) {
          console.error('[useAsyncFetch] request failed', error);
        }
        setState({ data: null, loading: false, error: message });
      }
    }

    run();

    return () => {
      isActive = false;
    };
  }, [...deps, version]);

  return { ...state, refresh: () => setVersion((current) => current + 1) };
}
