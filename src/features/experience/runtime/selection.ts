import type { RuntimeKind } from './types';

export function resolveRuntime(search: string): RuntimeKind {
  return new URLSearchParams(search).get('runtime') === 'legacy' ? 'legacy' : 'r3f';
}
