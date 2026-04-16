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
        setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Request failed' });
      }
    }

    run();

    return () => {
      isActive = false;
    };
  }, [...deps, version]);

  return { ...state, refresh: () => setVersion((current) => current + 1) };
}
