import { BitVector } from './bit-vector';
import type { SingleExportData, SingleExportSkill } from './types';

function parseUtcTimestamp(str: string): number {
  const [datePart, timePart] = str.split(' ');
  const [y, mo, d] = datePart!.split('-').map(Number);
  const [h, mi, s] = timePart!.split(':').map(Number);
  return Date.UTC(y!, mo! - 1, d, h, mi, s);
}

function formatUtcTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

const clampStat = (v: number) => Math.max(0, Math.min(2047, v));
const clampApt = (v: number) => Math.max(0, Math.min(9, v));

export function encodeSingleUma(data: SingleExportData): string {
  const bv = new BitVector();

  bv.write(2, 8);
  bv.write(data.card_id, 20);

  bv.write(clampStat(data.speed), 11);
  bv.write(clampStat(data.stamina), 11);
  bv.write(clampStat(data.power), 11);
  bv.write(clampStat(data.guts), 11);
  bv.write(clampStat(data.wiz), 11);

  bv.write(clampApt(data.proper_distance_short), 4);
  bv.write(clampApt(data.proper_distance_mile), 4);
  bv.write(clampApt(data.proper_distance_middle), 4);
  bv.write(clampApt(data.proper_distance_long), 4);
  bv.write(clampApt(data.proper_ground_turf), 4);
  bv.write(clampApt(data.proper_ground_dirt), 4);
  bv.write(clampApt(data.proper_running_style_nige), 4);
  bv.write(clampApt(data.proper_running_style_senko), 4);
  bv.write(clampApt(data.proper_running_style_sashi), 4);
  bv.write(clampApt(data.proper_running_style_oikomi), 4);

  const ms = parseUtcTimestamp(data.create_time);
  bv.write((Math.floor(ms / 1000)) >>> 0, 32);

  if (data.rank_score != null) {
    bv.write(1, 1);
    bv.write(Math.max(0, Math.min(32767, data.rank_score)), 15);
  } else {
    bv.write(0, 1);
  }

  const skills = data.skill_array.slice(0, 63);
  bv.write(skills.length, 6);
  for (const skill of skills) {
    bv.write(skill.skill_id, 20);
    bv.write(Math.max(0, Math.min(15, skill.skill_level - 1)), 4);
  }

  return bv.toBase64();
}

export function decodeSingleUma(encoded: string): SingleExportData | null {
  try {
    const bv = BitVector.fromBase64(encoded);

    if (bv.bitsRemaining() < 162) return null;

    const version = bv.read(8);
    if (version !== 2) return null;

    const card_id = bv.read(20);

    const speed = bv.read(11);
    const stamina = bv.read(11);
    const power = bv.read(11);
    const guts = bv.read(11);
    const wiz = bv.read(11);

    const proper_distance_short = bv.read(4);
    const proper_distance_mile = bv.read(4);
    const proper_distance_middle = bv.read(4);
    const proper_distance_long = bv.read(4);
    const proper_ground_turf = bv.read(4);
    const proper_ground_dirt = bv.read(4);
    const proper_running_style_nige = bv.read(4);
    const proper_running_style_senko = bv.read(4);
    const proper_running_style_sashi = bv.read(4);
    const proper_running_style_oikomi = bv.read(4);

    const ts = bv.read(32);
    const create_time = formatUtcTimestamp(ts * 1000);

    let rank_score: number | undefined;
    if (bv.read(1) === 1) {
      rank_score = bv.read(15);
    }

    const skill_count = bv.read(6);
    const skill_array: SingleExportSkill[] = [];
    for (let i = 0; i < skill_count; i++) {
      const skill_id = bv.read(20);
      const skill_level = bv.read(4) + 1;
      skill_array.push({ skill_id, skill_level });
    }

    return {
      card_id,
      speed,
      stamina,
      power,
      guts,
      wiz,
      proper_distance_short,
      proper_distance_mile,
      proper_distance_middle,
      proper_distance_long,
      proper_ground_turf,
      proper_ground_dirt,
      proper_running_style_nige,
      proper_running_style_senko,
      proper_running_style_sashi,
      proper_running_style_oikomi,
      create_time,
      rank_score,
      skill_array,
    };
  } catch {
    return null;
  }
}
