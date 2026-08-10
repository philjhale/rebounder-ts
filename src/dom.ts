/** Throws with `message` if `value` is null; otherwise narrows it to `T`. */
export function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}
