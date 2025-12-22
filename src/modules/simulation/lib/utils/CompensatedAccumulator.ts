export class CompensatedAccumulator {
  constructor(
    public acc: number,
    public err: number = 0.0,
  ) {}

  add(n: number) {
    const t = this.acc + n;
    if (Math.abs(this.acc) >= Math.abs(n)) {
      this.err += this.acc - t + n;
    } else {
      this.err += n - t + this.acc;
    }
    this.acc = t;
  }
}
