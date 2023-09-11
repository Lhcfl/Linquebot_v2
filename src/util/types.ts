/**
 * Recursively make everything readonly in the type.
 * To simulate 'true' const types.
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [k in keyof T]: DeepReadonly<T[k]> }
  : Readonly<T>;

/**
 * Wrap a type in an interface that can be either sync or async.
 *
 * (Not quite useful in implements, since they are often just async or sync directly)
 */
export type MaybePromise<T> = Promise<T> | T;
