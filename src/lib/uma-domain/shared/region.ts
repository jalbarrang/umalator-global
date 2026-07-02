// half-open interval [start,end)
export class Region {
  constructor(
    readonly start: number,
    readonly end: number
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
  rmap(f: (r: Region) => Region | Array<Region>) {
    const out = new RegionList();
    for (const r of this) {
      const newr = f(r);
      if (Array.isArray(newr)) {
        for (const nr of newr) {
          if (nr.start > -1) {
            out.push(nr);
          }
        }
      } else if (newr.start > -1) {
        out.push(newr);
      }
    }
    return out;
  }

  union(other: RegionList) {
    const regionList = new RegionList();
    const unitedRegions: Array<Region> = [...this, ...other].toSorted((a, b) => a.start - b.start);

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

  subtract(other: RegionList) {
    const regionList = new RegionList();
    const excludedRegions = new RegionList(...other).union(new RegionList());

    for (const region of this) {
      let segments = [region];

      for (const excluded of excludedRegions) {
        const nextSegments: Array<Region> = [];

        for (const segment of segments) {
          const overlapStart = Math.max(segment.start, excluded.start);
          const overlapEnd = Math.min(segment.end, excluded.end);

          if (overlapEnd <= overlapStart) {
            nextSegments.push(segment);
            continue;
          }

          if (segment.start < overlapStart) {
            nextSegments.push(new Region(segment.start, overlapStart));
          }

          if (overlapEnd < segment.end) {
            nextSegments.push(new Region(overlapEnd, segment.end));
          }
        }

        segments = nextSegments;

        if (segments.length === 0) {
          break;
        }
      }

      regionList.push(...segments);
    }

    return regionList;
  }
}
