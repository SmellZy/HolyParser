import type { WorkBudget } from "./bounds.js";
import { ownElement } from "./immutable.js";

// Public output layer (eighth-acceptance compatibility review). Inside the
// package every trusted record is a frozen null-prototype object (L-05) and
// all authoritative logic uses own-property semantics. Every accepted state up
// to ACCEPTANCE_7 published ordinary frozen plain objects, and no normative
// contract permits a null-prototype public result, so each public operation
// converts its result here, after every authoritative decision is made and
// before its final cancellation check:
//
// - a null-prototype or plain record becomes a frozen ordinary object with
//   the same own enumerable data properties (defined, never assigned, so a
//   "__proto__" key stays an own field);
// - an array becomes a frozen dense array, read by own index (L-07);
// - every other value (strings, bigints, booleans, ExactDecimal and the
//   trusted class instances) is returned as is.
//
// Internal records are immutable, so the copy of each one is cached: a
// record shared by two outputs (for example a ledger version returned by a
// command and listed in `ledger.versions`) is the same public object in both.
// No package operation ever reads a public copy; values a caller passes back
// are snapshotted again at the input boundary.
const publicCopies = new WeakMap<object, object>();

export function publicView<T>(value: T, work?: WorkBudget): T {
  if (value === null || typeof value !== "object") return value;
  const source = value as object;
  const cached = publicCopies.get(source);
  if (cached !== undefined) return cached as T;
  let copy: object;
  if (Array.isArray(source)) {
    const list = source as readonly unknown[];
    work?.units(2 * list.length + 1);
    const items: unknown[] = [];
    for (let index = 0; index < list.length; index += 1)
      items.push(publicView(ownElement(list, index), work));
    copy = Object.freeze(items);
  } else {
    const prototype = Object.getPrototypeOf(source) as unknown;
    if (prototype !== null && prototype !== Object.prototype) return value;
    const keys = Object.keys(source);
    work?.units(4 * keys.length + 1);
    const record: Record<string, unknown> = {};
    for (const key of keys)
      Object.defineProperty(record, key, {
        // An own key of a frozen data record: an own data read.
        value: publicView((source as Record<string, unknown>)[key], work),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    copy = Object.freeze(record);
  }
  publicCopies.set(source, copy);
  publicCopies.set(copy, copy);
  return copy as T;
}
