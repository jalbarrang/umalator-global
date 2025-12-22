export const binSearch = (numbers: ReadonlyArray<number>, searchedValue: number): number => {
  let lo = 0;
  let hi = numbers.length - 1;

  if (searchedValue < numbers[0]) return 0;
  if (searchedValue > numbers[hi]) return hi - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (searchedValue < numbers[mid]) {
      hi = mid - 1;
    } else if (searchedValue > numbers[mid]) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.abs(numbers[lo] - searchedValue) < Math.abs(numbers[hi] - searchedValue) ? lo : hi;
};

export const id = (x: number) => x;
