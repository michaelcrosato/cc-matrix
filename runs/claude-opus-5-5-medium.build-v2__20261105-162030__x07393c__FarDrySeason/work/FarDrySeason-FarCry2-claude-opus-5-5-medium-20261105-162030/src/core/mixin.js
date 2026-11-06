// A class kept in several files, as the plan lays them out: the parts' methods join the class.
export function mixin(target, ...parts) {
  for (const part of parts) for (const name of Object.getOwnPropertyNames(part.prototype)) if (name !== 'constructor') Object.defineProperty(target.prototype, name, Object.getOwnPropertyDescriptor(part.prototype, name));
}
