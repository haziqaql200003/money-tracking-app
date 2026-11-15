// In-memory AsyncStorage for the storage self-test, with switches to make reads and writes fail.
export const disk = new Map();
/** Every write that reached storage: ['set' | 'remove', key]. */
export const writes = [];
/** Keys (or a function key => boolean) whose getItem / setItem throws. */
export const failing = { get: new Set(), set: new Set() };
const hit = (rule, key) => [...rule].some((r) => (typeof r === 'function' ? r(key) : r === key));
const tick = () => new Promise((r) => setTimeout(r, 0));

export function resetStorage() {
  disk.clear();
  writes.length = 0;
  failing.get.clear();
  failing.set.clear();
}

export default {
  async getItem(key) {
    await tick();
    if (hit(failing.get, key)) throw new Error('fake: storage read failed');
    return disk.has(key) ? disk.get(key) : null;
  },
  async setItem(key, value) {
    await tick();
    if (hit(failing.set, key)) throw new Error('fake: storage is full');
    writes.push(['set', key]);
    disk.set(key, String(value));
  },
  async removeItem(key) {
    await tick();
    writes.push(['remove', key]);
    disk.delete(key);
  },
  async getAllKeys() {
    await tick();
    return [...disk.keys()];
  },
  async multiRemove(keys) {
    for (const k of keys) {
      writes.push(['remove', k]);
      disk.delete(k);
    }
  },
};
