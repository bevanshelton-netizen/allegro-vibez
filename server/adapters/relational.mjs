import { createRepository } from '../domain/repository.mjs';

export function createRelationalRepository({ query, transaction = async (fn) => fn() }) {
  if (typeof query !== 'function') throw new TypeError('query function is required');
  return createRepository({
    async create(collection, input) {
      const result = await query({ operation: 'create', collection, input, transaction });
      return result?.row ?? result;
    },
    async get(collection, filter = {}) {
      const result = await query({ operation: 'get', collection, filter, transaction });
      return result?.row ?? result ?? null;
    },
    async list(collection, filter = {}) {
      const result = await query({ operation: 'list', collection, filter, transaction });
      return result?.rows ?? result ?? [];
    },
    async update(collection, id, patch) {
      const result = await query({ operation: 'update', collection, id, patch, transaction });
      return result?.row ?? result ?? null;
    },
    async delete(collection, id) {
      const result = await query({ operation: 'delete', collection, id, transaction });
      return result?.deleted ?? result;
    }
  });
}
