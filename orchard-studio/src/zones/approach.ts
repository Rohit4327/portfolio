/** Lift lobby, corridor and entry details. Filled in during Phase 3. */
import { group } from '../core/build';
import type { Registry } from './fixtures';

export function buildApproachDetails(_registry: Registry) {
  return group('approach-details');
}
