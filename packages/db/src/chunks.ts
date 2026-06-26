export const SQLITE_BINDING_CHUNK_SIZE = 500;

export const chunks = <T>(values: ReadonlyArray<T>, size: number): T[][] => {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push([...values.slice(index, index + size)]);
  }

  return result;
};
