import { describe, it, expect } from 'vitest';
import { Mood, Strategy, StrategyName } from 'sunday-tools/runner/definitions';
import { GroundCondition, Season, Weather } from 'sunday-tools/course/definitions';
import { parseHakurakuRaceJson } from './hakuraku';

const horse = (overrides: Record<string, unknown> = {}) => ({
  card_id: 100101,
  speed: 1200,
  stamina: 900,
  power: 800,
  guts: 600,
  wiz: 700,
  proper_distance_short: 7,
  proper_distance_mile: 7,
  proper_distance_middle: 8,
  proper_distance_long: 6,
  proper_ground_turf: 8,
  proper_ground_dirt: 1,
  proper_running_style_nige: 8,
  proper_running_style_senko: 7,
  proper_running_style_sashi: 6,
  proper_running_style_oikomi: 5,
  running_style: Strategy.PaceChaser,
  skill_array: [{ skill_id: 200331, skill_level: 1 }],
  ...overrides
});

describe('parseHakurakuRaceJson', () => {
  it('parses the new race_horse_data_array format', () => {
    const json = JSON.stringify({
      race_horse_data_array: [horse(), horse({ card_id: 100201, running_style: Strategy.EndCloser })],
      race_course_set: { id: 10101 },
      ground_condition: GroundCondition.Good,
      weather: Weather.Rainy,
      season: Season.Summer
    });

    const snapshot = parseHakurakuRaceJson(json);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.courseId).toBe(10101);
    expect(snapshot?.runners).toHaveLength(2);
    expect(snapshot?.racedef.ground).toBe(GroundCondition.Good);
    expect(snapshot?.racedef.weather).toBe(Weather.Rainy);
    expect(snapshot?.racedef.season).toBe(Season.Summer);

    const [first, second] = snapshot!.runners;
    expect(first.outfitId).toBe('100101');
    expect(first.speed).toBe(1200);
    expect(first.power).toBe(800);
    expect(first.strategy).toBe(StrategyName[Strategy.PaceChaser]);
    expect(first.mood).toBe(Mood.Normal);
    expect(first.skills).toEqual(['200331']);
    expect(second.strategy).toBe(StrategyName[Strategy.EndCloser]);
    expect(snapshot?.nsamples).toBe(1);
    expect(snapshot?.seed).toBeNull();
  });

  it('parses the legacy <RaceHorse>k__BackingField format', () => {
    const json = JSON.stringify({
      '<RaceHorse>k__BackingField': [
        { _responseHorseData: horse({ pow: 850, power: undefined }) }
      ],
      '<RaceCourseSet>k__BackingField': { '<Id>k__BackingField': 20202 },
      '<GroundCondition>k__BackingField': GroundCondition.Heavy,
      '<Weather>k__BackingField': Weather.Snowy,
      '<Season>k__BackingField': 5
    });

    const snapshot = parseHakurakuRaceJson(json);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.courseId).toBe(20202);
    expect(snapshot?.runners).toHaveLength(1);
    expect(snapshot?.runners[0].power).toBe(850); // pow fallback
    expect(snapshot?.racedef.ground).toBe(GroundCondition.Heavy);
    expect(snapshot?.racedef.season).toBe(Season.Spring); // 5 -> Spring
  });

  it('normalizes skill_array variants', () => {
    const json = JSON.stringify({
      race_horse_data_array: [
        horse({ skill_array: [200331, { skillId: 200332 }, { skill_id: 200333, level: 2 }, 0] })
      ],
      race_course_set: { id: 10101 }
    });
    const snapshot = parseHakurakuRaceJson(json);
    expect(snapshot?.runners[0].skills).toEqual(['200331', '200332', '200333']);
  });

  it('uses fallbackCourseId when file lacks a course id', () => {
    const json = JSON.stringify({ race_horse_data_array: [horse()] });
    expect(parseHakurakuRaceJson(json)).toBeNull();
    expect(parseHakurakuRaceJson(json, { fallbackCourseId: 30303 })?.courseId).toBe(30303);
  });

  it('parses the Hakuraku replay API payload with compact aptitudes', () => {
    const json = JSON.stringify({
      race: { courseId: 10602, groundCondition: '1', weather: '1', season: '1' },
      replay: {
        raceHorseDataArray: [
          {
            card_id: 102701,
            running_style: Strategy.LateSurger,
            motivation: 5,
            speed: 1200,
            stamina: 744,
            pow: 1029,
            guts: 893,
            wiz: 898,
            apt_ground: 7,
            apt_distance: 8,
            apt_style: 7,
            skill_array: [100271, 200154, 900061]
          }
        ]
      }
    });

    const snapshot = parseHakurakuRaceJson(json);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.courseId).toBe(10602);
    expect(snapshot?.racedef.ground).toBe(GroundCondition.Firm);

    const [runner] = snapshot!.runners;
    expect(runner.outfitId).toBe('102701');
    expect(runner.power).toBe(1029); // pow alias
    expect(runner.strategy).toBe(StrategyName[Strategy.LateSurger]);
    expect(runner.mood).toBe(Mood.Great); // motivation 5 -> Great
    expect(runner.distanceAptitude).toBe('S'); // apt_distance 8
    expect(runner.surfaceAptitude).toBe('A'); // apt_ground 7
    expect(runner.strategyAptitude).toBe('A'); // apt_style 7
    expect(runner.skills).toEqual(['100271', '200154', '900061']);
  });

  it('rejects non-race JSON and garbage', () => {
    expect(parseHakurakuRaceJson('not json')).toBeNull();
    expect(parseHakurakuRaceJson('{}')).toBeNull();
    expect(parseHakurakuRaceJson(JSON.stringify({ version: 1, runners: [] }))).toBeNull();
    expect(
      parseHakurakuRaceJson(JSON.stringify({ race_horse_data_array: [{ speed: 1 }] }))
    ).toBeNull(); // no card_id -> no runners
  });
});
