// Always return a fresh record: app state must not mutate authored content.
// The explicit sentinel preserves JavaScript's original undefined fields in JSON.
export function copyProfile(value: unknown): any {
  if (Array.isArray(value)) return value.map(copyProfile);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && Object.hasOwn(value, '$characterUndefined') && (value as any).$characterUndefined === true) return undefined;
    return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,copyProfile(item)]));
  }
  if (typeof value === 'string') return value.replace(/Cyacademy|Cycademy(?: of Sciences)?/g, 'Cyberium Academy').replace('Cyberium Academy of Sciences', 'Cyberium Academy').replace('Cyberium Academy University', 'Cyberium Academy');
  return value;
}
