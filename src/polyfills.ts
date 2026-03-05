if (!Array.prototype.toSorted) {
  Object.defineProperty(Array.prototype, 'toSorted', {
    value: function toSorted<T>(this: Array<T>, compareFn?: (a: T, b: T) => number) {
      return [...this].sort(compareFn);
    },
    writable: true,
    configurable: true,
  });
}

if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed<T>(this: Array<T>) {
      return [...this].reverse();
    },
    writable: true,
    configurable: true,
  });
}

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value: function at<T>(this: Array<T>, index: number) {
      const normalizedIndex = index >= 0 ? index : this.length + index;

      if (normalizedIndex < 0 || normalizedIndex >= this.length) {
        return undefined;
      }

      return this[normalizedIndex];
    },
    writable: true,
    configurable: true,
  });
}

const cryptoRef = globalThis.crypto;
if (cryptoRef && !cryptoRef.randomUUID) {
  Object.defineProperty(cryptoRef, 'randomUUID', {
    value: function randomUUID() {
      const bytes = new Uint8Array(16);
      cryptoRef.getRandomValues(bytes);

      // RFC 4122 version 4 UUID bits.
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
      return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
    },
    writable: true,
    configurable: true,
  });
}
