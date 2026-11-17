import { signal } from './signal.js';

export function resource(fetcher) {
  const data = signal(null);
  const loading = signal(false);
  const error = signal(null);
  let token = 0;

  async function load(...args) {
    const my = ++token;
    loading.value = true;
    error.value = null;
    try {
      const result = await fetcher(...args);
      if (my === token) data.value = result;
    } catch (e) {
      if (my === token) error.value = e;
    } finally {
      if (my === token) loading.value = false;
    }
    return data.peek();
  }

  function mutate(fn) {
    data.value = fn(data.peek());
  }

  return { data, loading, error, load, mutate };
}
