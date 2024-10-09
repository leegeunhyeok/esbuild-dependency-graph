export function assertValue<T>(value: T, message: string): NonNullable<T> {
  if (value) {
    return value;
  }

  throw new Error(message);
}
