import {isHash, makeBoolean, makeFloat, makeInt, makeString, StringHash, Value} from './Util';

const wellKnownTypes: {[s: string]: Function} = {
  Boolean: makeBoolean,
  Integer: makeInt,
  Float: makeFloat,
  Number: makeFloat,
  String: makeString,
};

/**
 * Maps constructors to names of types
 */
export class TypeNames {
  private typeMap: Map<Function, string>;

  constructor(base: Value) {
    const tn = new Map<Function, string>();
    TypeNames.createTypeMap(null, base, tn);
    this.typeMap = tn;
  }

  nameForType(type: Function): string|undefined {
    return this.typeMap.get(type);
  }

  private static createTypeMap(ns: string|null, base: Value, map: Map<Function, string>): void {
    if (base === null) {
      return;
    }

    if (ns !== null && typeof base === 'function') {
      map.set(base, ns);
      return;
    }

    if (typeof base === 'object') {
      const hb = base as {[s: string]: Value};
      for (const key in hb) {
        if (key.match(/^[A-Z]/)) {
          TypeNames.createTypeMap(ns === null ? key : ns + '::' + key, hb[key], map);
        }
      }
    }
  }
}

export class Context {
  private readonly nsBase: Value;
  readonly typeNames: TypeNames;

  constructor(nsBase: Value) {
    this.nsBase = nsBase;
    this.typeNames = new TypeNames(nsBase);
  }

  /**
   * Parse a double-colon separated type name and return the
   * corresponding constructor for the type
   *
   * @param typeString
   */
  parseType(typeString: string): Function|undefined {
    const parts = typeString.split('::');
    if (parts.length === 1) {
      // Check if well known type
      const t = wellKnownTypes[parts[0]];
      if (t !== undefined) {
        return t;
      }
    }

    let c: Value|undefined = this.nsBase;
    for (const part of parts) {
      if (isHash(c)) {
        c = (c as StringHash)[part];
      }
      if (c === undefined) {
        break;
      }
    }
    if (c === undefined || typeof c !== 'function') {
      // Not a function, so not a constructor
      return undefined;
    }
    return c as Function;
  }

  createInstance(type: Function, value: Value): Value {
    const tf = () => {};
    tf.prototype = type.prototype;
    // @ts-ignore
    const inst = new tf();

    if (isHash(value)) {
      const ks = Object.keys(value);
      if (ks.length === 0) {
        return inst;
      }

      if (type.prototype.__ptype !== undefined) {
        type.apply(inst, [value]);
      } else {
        type.apply(inst, ks.map(k => (value as StringHash)[k]));
      }
      return inst;
    }

    type.apply(inst, [value]);
    return inst;
  }
}
