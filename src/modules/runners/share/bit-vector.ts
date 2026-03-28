const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export class BitVector {
  private bits: number[] = [];
  private readPos = 0;

  write(value: number, bitLength: number): void {
    for (let i = bitLength - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }

  read(bitLength: number): number {
    let value = 0;
    for (let i = 0; i < bitLength; i++) {
      // Multiply instead of shift to safely handle unsigned 32-bit values
      value = value * 2 + (this.bits[this.readPos++] ?? 0);
    }
    return value;
  }

  bitsRemaining(): number {
    return this.bits.length - this.readPos;
  }

  toBase64(): string {
    while (this.bits.length % 6 !== 0) {
      this.bits.push(0);
    }
    let result = '';
    for (let i = 0; i < this.bits.length; i += 6) {
      let index = 0;
      for (let j = 0; j < 6; j++) {
        index = (index << 1) | (this.bits[i + j] ?? 0);
      }
      result += BASE64_CHARS[index];
    }
    return result;
  }

  static fromBase64(str: string): BitVector {
    const bv = new BitVector();
    for (const char of str) {
      const index = BASE64_CHARS.indexOf(char);
      if (index === -1) continue;
      for (let j = 5; j >= 0; j--) {
        bv.bits.push((index >> j) & 1);
      }
    }
    return bv;
  }
}
