import { describe, expect, test } from 'bun:test';
import {
  AndOperator,
  EqOperator,
  GtOperator,
  GteOperator,
  LtOperator,
  LteOperator,
  NeqOperator,
  OrOperator,
} from '../operators';
import { Region, RegionList } from '../../../../utils/Region';
import { ImmediatePolicy, RandomPolicy } from '../../../policies/ActivationSamplePolicy';
import { immediate, random } from '../utils';
import {
  createMockCourse,
  createMockHorse,
  createMockRaceParams,
  createMockRaceState,
  createWholeRegion,
} from './fixtures';
import { Phase } from '@/modules/simulation/lib/course/definitions';
import { Strategy } from '@/modules/simulation/lib/runner/definitions';

describe('operators', () => {
  describe('EqOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterEq: (regions) => regions,
      });
      const op = new EqOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterEq', () => {
      let called = false;
      const condition = immediate({
        filterEq: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new EqOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, dynamicCond] = op.apply(regions, course, horse, params);

      expect(called).toBe(true);
      expect(resultRegions).toBeInstanceOf(RegionList);
      expect(typeof dynamicCond).toBe('function');
    });

    test('apply returns dynamic condition when filter returns tuple', () => {
      const mockDynamicCond = (state: any) => state.value > 5;
      const condition = immediate({
        filterEq: (regions) => [regions, mockDynamicCond] as any,
      });
      const op = new EqOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, dynamicCond] = op.apply(regions, course, horse, params);

      expect(resultRegions).toBeInstanceOf(RegionList);
      expect(dynamicCond).toBe(mockDynamicCond);
    });
  });

  describe('NeqOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterNeq: (regions) => regions,
      });
      const op = new NeqOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterNeq', () => {
      let called = false;
      const condition = immediate({
        filterNeq: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new NeqOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      op.apply(regions, course, horse, params);

      expect(called).toBe(true);
    });
  });

  describe('LtOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterLt: (regions) => regions,
      });
      const op = new LtOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterLt', () => {
      let called = false;
      const condition = immediate({
        filterLt: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new LtOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      op.apply(regions, course, horse, params);

      expect(called).toBe(true);
    });
  });

  describe('LteOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterLte: (regions) => regions,
      });
      const op = new LteOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterLte', () => {
      let called = false;
      const condition = immediate({
        filterLte: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new LteOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      op.apply(regions, course, horse, params);

      expect(called).toBe(true);
    });
  });

  describe('GtOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterGt: (regions) => regions,
      });
      const op = new GtOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterGt', () => {
      let called = false;
      const condition = immediate({
        filterGt: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new GtOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      op.apply(regions, course, horse, params);

      expect(called).toBe(true);
    });
  });

  describe('GteOperator', () => {
    test('creates operator with condition and argument', () => {
      const condition = immediate({
        filterGte: (regions) => regions,
      });
      const op = new GteOperator(condition, 5);

      expect(op.condition).toBe(condition);
      expect(op.argument).toBe(5);
      expect(op.samplePolicy).toBe(ImmediatePolicy);
    });

    test('apply calls condition filterGte', () => {
      let called = false;
      const condition = immediate({
        filterGte: (regions, arg) => {
          called = true;
          expect(arg).toBe(10);
          return regions;
        },
      });
      const op = new GteOperator(condition, 10);
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      op.apply(regions, course, horse, params);

      expect(called).toBe(true);
    });
  });

  describe('AndOperator', () => {
    test('creates operator with left and right operators', () => {
      const leftCond = immediate({ filterEq: (regions) => regions });
      const rightCond = immediate({ filterEq: (regions) => regions });
      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      expect(andOp.left).toBe(left);
      expect(andOp.right).toBe(right);
    });

    test('reconciles sample policies from left and right', () => {
      const leftCond = immediate({ filterEq: (regions) => regions });
      const rightCond = random({ filterEq: (regions) => regions });
      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      // Random should dominate immediate
      expect(andOp.samplePolicy).toBe(RandomPolicy);
    });

    test('apply calls both left and right operators', () => {
      let leftCalled = false;
      let rightCalled = false;

      const leftCond = immediate({
        filterEq: (regions) => {
          leftCalled = true;
          return regions;
        },
      });
      const rightCond = immediate({
        filterEq: (regions) => {
          rightCalled = true;
          return regions;
        },
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      andOp.apply(regions, course, horse, params);

      expect(leftCalled).toBe(true);
      expect(rightCalled).toBe(true);
    });

    test('apply passes left result regions to right operator', () => {
      const leftCond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(100, 500));
          return result;
        },
      });
      const rightCond = immediate({
        filterEq: (regions) => {
          // Should receive the narrowed regions from left
          expect(regions.length).toBe(1);
          expect(regions[0].start).toBe(100);
          expect(regions[0].end).toBe(500);
          return regions;
        },
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      andOp.apply(regions, course, horse, params);
    });

    test('apply combines dynamic conditions with AND logic', () => {
      const leftDynamic = (state: any) => state.value1 > 5;
      const rightDynamic = (state: any) => state.value2 < 10;

      const leftCond = immediate({
        filterEq: (regions) => [regions, leftDynamic] as any,
      });
      const rightCond = immediate({
        filterEq: (regions) => [regions, rightDynamic] as any,
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [_, combinedDynamic] = andOp.apply(regions, course, horse, params);

      // Test combined condition
      expect(combinedDynamic(createMockRaceState({ value1: 6, value2: 9 }))).toBe(true);
      expect(combinedDynamic(createMockRaceState({ value1: 4, value2: 9 }))).toBe(false);
      expect(combinedDynamic(createMockRaceState({ value1: 6, value2: 11 }))).toBe(false);
    });

    test('apply optimizes when both conditions are static (kTrue)', () => {
      const leftCond = immediate({
        filterEq: (regions) => regions,
      });
      const rightCond = immediate({
        filterEq: (regions) => regions,
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const andOp = new AndOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [_, dynamicCond] = andOp.apply(regions, course, horse, params);

      // Should be kTrue (always returns true)
      expect(dynamicCond(createMockRaceState())).toBe(true);
    });
  });

  describe('OrOperator', () => {
    test('creates operator with left and right operators', () => {
      const leftCond = immediate({ filterEq: (regions) => regions });
      const rightCond = immediate({ filterEq: (regions) => regions });
      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      expect(orOp.left).toBe(left);
      expect(orOp.right).toBe(right);
    });

    test('reconciles sample policies from left and right', () => {
      const leftCond = immediate({ filterEq: (regions) => regions });
      const rightCond = random({ filterEq: (regions) => regions });
      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      // Random should dominate immediate
      expect(orOp.samplePolicy).toBe(RandomPolicy);
    });

    test('apply calls both left and right operators', () => {
      let leftCalled = false;
      let rightCalled = false;

      const leftCond = immediate({
        filterEq: (regions) => {
          leftCalled = true;
          return regions;
        },
      });
      const rightCond = immediate({
        filterEq: (regions) => {
          rightCalled = true;
          return regions;
        },
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      orOp.apply(regions, course, horse, params);

      expect(leftCalled).toBe(true);
      expect(rightCalled).toBe(true);
    });

    test('apply unions regions from left and right', () => {
      const leftCond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(100, 500));
          return result;
        },
      });
      const rightCond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(600, 900));
          return result;
        },
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, _] = orOp.apply(regions, course, horse, params);

      expect(resultRegions.length).toBe(2);
      expect(resultRegions[0].start).toBe(100);
      expect(resultRegions[0].end).toBe(500);
      expect(resultRegions[1].start).toBe(600);
      expect(resultRegions[1].end).toBe(900);
    });

    test('apply combines dynamic conditions with OR logic', () => {
      const leftDynamic = (state: any) => state.value1 > 5;
      const rightDynamic = (state: any) => state.value2 < 10;

      const leftCond = immediate({
        filterEq: (regions) => [regions, leftDynamic] as any,
      });
      const rightCond = immediate({
        filterEq: (regions) => [regions, rightDynamic] as any,
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [_, combinedDynamic] = orOp.apply(regions, course, horse, params);

      // Test combined condition with OR logic
      expect(combinedDynamic(createMockRaceState({ value1: 6, value2: 9 }))).toBe(true);
      expect(combinedDynamic(createMockRaceState({ value1: 4, value2: 9 }))).toBe(true);
      expect(combinedDynamic(createMockRaceState({ value1: 6, value2: 11 }))).toBe(true);
      expect(combinedDynamic(createMockRaceState({ value1: 4, value2: 11 }))).toBe(false);
    });

    test('apply merges overlapping regions', () => {
      const leftCond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(100, 500));
          return result;
        },
      });
      const rightCond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(400, 700));
          return result;
        },
      });

      const left = new EqOperator(leftCond, 1);
      const right = new EqOperator(rightCond, 2);
      const orOp = new OrOperator(left, right);

      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, _] = orOp.apply(regions, course, horse, params);

      // Overlapping regions should be merged
      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(100);
      expect(resultRegions[0].end).toBe(700);
    });
  });

  describe('Complex operator combinations', () => {
    test('nested AND operators work correctly', () => {
      const cond1 = immediate({
        filterEq: (regions) => {
          // Intersect with [0, 1000)
          return regions.rmap((r) => r.intersect(new Region(0, 1000)));
        },
      });
      const cond2 = immediate({
        filterEq: (regions) => {
          // Intersect with [500, 1500)
          return regions.rmap((r) => r.intersect(new Region(500, 1500)));
        },
      });
      const cond3 = immediate({
        filterEq: (regions) => {
          // Intersect with [700, 2000)
          return regions.rmap((r) => r.intersect(new Region(700, 2000)));
        },
      });

      const op1 = new EqOperator(cond1, 1);
      const op2 = new EqOperator(cond2, 2);
      const op3 = new EqOperator(cond3, 3);

      // (op1 AND op2) AND op3
      const and1 = new AndOperator(op1, op2);
      const and2 = new AndOperator(and1, op3);

      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, _] = and2.apply(regions, course, horse, params);

      // Should be intersection of all three: [700, 1000)
      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(700);
      expect(resultRegions[0].end).toBe(1000);
    });

    test('AND and OR operators can be combined', () => {
      // (phase==0 AND running_style==1) OR (phase==2 AND running_style==2)
      const phase0Cond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(0, 600));
          return result;
        },
      });
      const phase2Cond = immediate({
        filterEq: (_) => {
          const result = new RegionList();
          result.push(new Region(1200, 2000));
          return result;
        },
      });
      const style1Cond = immediate({ filterEq: (regions) => regions });
      const style2Cond = immediate({ filterEq: (regions) => regions });

      const phase0Op = new EqOperator(phase0Cond, 0);
      const style1Op = new EqOperator(style1Cond, 1);
      const phase2Op = new EqOperator(phase2Cond, 2);
      const style2Op = new EqOperator(style2Cond, 2);

      const leftAnd = new AndOperator(phase0Op, style1Op);
      const rightAnd = new AndOperator(phase2Op, style2Op);
      const orOp = new OrOperator(leftAnd, rightAnd);

      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const [resultRegions, _] = orOp.apply(regions, course, horse, params);

      // Should have two regions: [0, 600) and [1200, 2000)
      expect(resultRegions.length).toBe(2);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(600);
      expect(resultRegions[1].start).toBe(1200);
      expect(resultRegions[1].end).toBe(2000);
    });
  });
});
