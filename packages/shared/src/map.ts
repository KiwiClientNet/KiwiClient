export default function deduplicate<K, V>(map: Map<K, Promise<V>>, key: K, factory: () => Promise<V>): Promise<V> {
    const existing = map.get(key);

    if (existing) {
        return existing;
    }

    const created = factory().finally(() => map.delete(key));

    map.set(key, created);

    return created;
}
