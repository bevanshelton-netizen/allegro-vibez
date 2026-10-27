export function createAdapterRegistry(adapters = {}) {
  const names = [
    'identity',
    'storage',
    'catalogue',
    'rights',
    'ledger',
    'payments',
    'community',
    'commerce',
    'distribution',
    'audit'
  ];

  return Object.freeze(
    Object.fromEntries(
      names.map((name) => [name, adapters[name] ?? notConfiguredAdapter(name)])
    )
  );
}

function notConfiguredAdapter(name) {
  return Object.freeze({
    status: 'NOT_CONFIGURED',
    name,
    async execute() {
      const error = new Error(`${name} adapter is not configured`);
      error.code = 'NOT_CONFIGURED';
      throw error;
    }
  });
}
