// these are commonly initialized with a negative number and then checked >= 0 to see if a duration is up
// (the reason for doing that instead of initializing with 0 and then checking against the duration is if
// the code that checks for the duration expiring is separate from the code that initializes the timer and
// has to deal with different durations)
export class Timer {
  constructor(public t: number) {}
}

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
