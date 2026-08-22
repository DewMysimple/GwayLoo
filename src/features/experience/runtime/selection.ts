import type { RuntimeKind } from './types';

export function resolveRuntime(search: string): RuntimeKind {
  return new URLSearchParams(search).get('runtime') === 'r3f' ? 'r3f' : 'legacy';
}
