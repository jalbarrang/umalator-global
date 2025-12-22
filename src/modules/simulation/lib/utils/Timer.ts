// these are commonly initialized with a negative number and then checked >= 0 to see if a duration is up
// (the reason for doing that instead of initializing with 0 and then checking against the duration is if
// the code that checks for the duration expiring is separate from the code that initializes the timer and
// has to deal with different durations)

export class InGameTimer {
  t: number;

  constructor(t: number = 0) {
    this.t = t;
  }
}

export class GameTimerManager {
  private timers: Array<InGameTimer>;

  constructor() {
    this.timers = [];
  }

  createTimer(t: number = 0) {
    const timer = new InGameTimer(t);
    this.timers.push(timer);

    return timer;
  }

  addTimer(timer: InGameTimer) {
    this.timers.push(timer);
  }

  update() {
    for (let i = 0; i < this.timers.length; i++) {
      this.timers[i].t--;
    }
  }

  getTimer(index: number) {
    return this.timers[index];
  }

  removeTimer(index: number) {
    this.timers = this.timers.filter((_, i) => i !== index);
  }
}
