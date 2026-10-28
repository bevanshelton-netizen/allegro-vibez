import { createRepository } from '../domain/repository.mjs';

export function createMemoryRepository() {
  const collections = new Map();
  let sequence = 0;
  const getCollection = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };
  return createRepository({
    async create(name, input) {
      const id = `${name}-${++sequence}`;
      const row = { id, createdAt: new Date().toISOString(), ...input };
      getCollection(name).set(id, row);
      return row;
    },
    async get(name, filter = {}) {
      return [...getCollection(name).values()].find((row) => Object.entries(filter).every(([key, value]) => row[key] === value)) ?? null;
    },
    async list(name, filter = {}) {
      return [...getCollection(name).values()].filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
    },
    async update(name, id, patch) {
      const row = getCollection(name).get(id);
      if (!row) return null;
      const updated = { ...row, ...patch, updatedAt: new Date().toISOString() };
      getCollection(name).set(id, updated);
      return updated;
    },
    async delete(name, id) {
      return getCollection(name).delete(id);
    }
  });
}
