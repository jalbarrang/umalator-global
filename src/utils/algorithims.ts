export function binSearch(a: Array<number>, x: number) {
  let lo = 0;
  let hi = a.length - 1;

  if (x < a[0]) return 0;
  if (x > a[hi]) return hi - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (x < a[mid]) {
      hi = mid - 1;
    } else if (x > a[mid]) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.abs(a[lo] - x) < Math.abs(a[hi] - x) ? lo : hi;
}

export function id(x: number) {
  return x;
}
