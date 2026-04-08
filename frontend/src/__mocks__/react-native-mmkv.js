const stores = new Map();

function createMMKV(config) {
  const id = config?.id || 'default';
  if (!stores.has(id)) {
    stores.set(id, new Map());
  }
  const store = stores.get(id);

  return {
    id,
    set: (key, value) => store.set(key, value),
    getString: (key) => {
      const val = store.get(key);
      return typeof val === 'string' ? val : undefined;
    },
    getBoolean: (key) => {
      const val = store.get(key);
      return typeof val === 'boolean' ? val : undefined;
    },
    getNumber: (key) => {
      const val = store.get(key);
      return typeof val === 'number' ? val : undefined;
    },
    getBuffer: () => undefined,
    contains: (key) => store.has(key),
    remove: (key) => store.delete(key),
    getAllKeys: () => [...store.keys()],
    clearAll: () => store.clear(),
    addOnValueChangedListener: () => ({ remove: () => {} }),
    length: store.size,
    byteSize: 0,
    size: 0,
    isReadOnly: false,
    isEncrypted: false,
    recrypt: () => {},
    encrypt: () => {},
    decrypt: () => {},
    trim: () => {},
    importAllFrom: () => 0,
  };
}

module.exports = {
  createMMKV,
};
