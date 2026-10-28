export const REPOSITORY_COLLECTIONS = Object.freeze([
  'users', 'sessions', 'artists', 'releases', 'tracks', 'rights_splits',
  'ledger_entries', 'payments', 'payouts', 'orders', 'audio_assets', 'community_posts',
  'distribution_jobs', 'audit_events'
]);

export class RepositoryNotConfiguredError extends Error {
  constructor(operation) {
    super(`Persistent repository is not configured: ${operation}`);
    this.name = 'RepositoryNotConfiguredError';
    this.code = 'NOT_CONFIGURED';
  }
}
export function createRepository(overrides = {}) {
  const methods = ['create', 'get', 'list', 'update', 'delete'];
  const repository = {};
  for (const method of methods) repository[method] = overrides[method] ?? (async () => { throw new RepositoryNotConfiguredError(method); });
  return Object.freeze(repository);
}
