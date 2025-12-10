// half-open interval [start,end)
export class Region {
  constructor(
    readonly start: number,
    readonly end: number,
  ) {}

  intersect(other: { start: number; end: number }) {
    const start = Math.max(this.start, other.start);
    const end = Math.min(this.end, other.end);
    if (end <= start) {
      return new Region(-1, -1);
    } else {
      return new Region(start, end);
    }
  }

  fullyContains(other: { start: number; end: number }) {
    return this.start <= other.start && this.end >= other.end;
  }
}

export class RegionList extends Array<Region> {
  rmap(f: (r: Region) => Region | Region[]) {
    const out = new RegionList();
    this.forEach((r) => {
      const newr = f(r);
      if (Array.isArray(newr)) {
        newr.forEach((nr) => {
          if (nr.start > -1) {
            out.push(nr);
          }
        });
      } else if (newr.start > -1) {
        out.push(newr);
      }
    });
    return out;
  }

  union(other: RegionList) {
    const regionList = new RegionList();
    const unitedRegions: Region[] = [...this, ...other].toSorted(
      (a, b) => a.start - b.start,
    );

    if (unitedRegions.length == 0) {
      return regionList;
    }

    const regionReduced = unitedRegions.reduce((a, b) => {
      if (a.fullyContains(b)) return a;

      if (a.start <= b.start && b.start < a.end) {
        return new Region(a.start, b.end);
      }

      if (a.start < b.end && b.end <= a.end) {
        return new Region(b.start, a.end);
      }

      regionList.push(a);
      return b;
    });

    regionList.push(regionReduced);

    return regionList;
  }
}
