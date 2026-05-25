# Support Card Skill Source Investigation

> **Status: Resolved.** Event skills are now populated via GameTora's manifest API. See [data-pipeline.md](data-pipeline.md) for the full picture of how data flows into the project.

This note records the investigation into how support-card skill sources are represented in the Global `master.mdb` snapshot, and why event rewards needed an external source.

## Hint skills

Hint skills are available directly in master data.

Relevant tables:

- `support_card_data`
  - `id`: support card id
  - `skill_set_id`: hint pool id used by the card
- `single_mode_hint_gain`
  - `support_card_id`: support card id
  - `hint_id`: hint pool id
  - `hint_gain_type`: reward kind
  - `hint_value_1`: skill id when `hint_gain_type = 0`
  - `hint_value_2`: hint level for skill hints; currently `1` in this snapshot
- `skill_data`
  - `id`: skill id
  - `rarity`: skill rarity
- `text_data`
  - category `47`: skill names

Extractor join:

```sql
SELECT DISTINCT
  hg.support_card_id AS supportCardId,
  hg.hint_value_1 AS skillId,
  skill_name.text AS name,
  sd.rarity
FROM single_mode_hint_gain hg
JOIN support_card_data sc
  ON sc.id = hg.support_card_id
 AND sc.skill_set_id = hg.hint_id
JOIN skill_data sd
  ON sd.id = hg.hint_value_1
LEFT JOIN text_data skill_name
  ON skill_name.category = 47 AND skill_name."index" = hg.hint_value_1
WHERE hg.hint_gain_type = 0;
```

Findings in the current DB:

- `hint_gain_type = 0`: 1,236 rows, `hint_value_1` is a skill id, `hint_value_2` is always `1`.
- `hint_gain_type = 1`: 435 rows, `hint_value_1` ranges `1..30` and `hint_value_2` ranges `1..6`; these are non-skill hint/status entries and are intentionally excluded from `hintSkills`.

## Event skills

Support-card event story metadata is present, but event rewards are not represented as a reliable `story_id -> skill_id` relation in this DB snapshot. This was checked both by following tables that look semantically relevant and by brute-force scanning every integer column in every table for known ids.

Relevant tables checked by schema/semantics:

- `single_mode_story_data`
  - Contains support-card event story ids.
  - Current DB: 359 support-card story rows across 130 support cards.
  - Example Kitasan Black SSR `[Fire at My Heels]` (`support_card_id = 30028`) has stories `830028001`, `830028002`, `830028003`.
- `text_data`, category `181`
  - Contains support-card event titles for those story ids.
  - Example Kitasan titles: `Chasing Brilliance`, `Paying It Forward`, `We Walk Together`.
- `single_mode_conclusion_set`
  - Joins to 344 of the 359 support-card story rows, but all joined support-card rows use `root_id = 0`, `conclusion_id = 1`.
  - This identifies a generic conclusion bucket, not specific skill rewards.
- `single_mode_event_conclusion`
  - Contains conclusion animation/motion data keyed by conclusion id and character, not reward contents.
- `single_mode_event_choice_reward`
  - Contains only small display/effect type ids (`0..7` in effect columns), not skill ids.
- `single_mode_reward_set`
  - Current rows only use reward types `1` and `2`; no skill reward ids were found here for support-card stories.
- `skill_set`
  - Contains skill pools for NPCs, races, available skills, etc. Brute-force checks for a known event skill (`Professor of Curvature`, id `200331`) found references in `skill_set`, but none are linked to `support_card_data` or support-card story ids.

Brute-force integer search for `Professor of Curvature` (`200331`) found only:

- `skill_data`
- `skill_set`
- `available_skill_set`
- `mission_data`
- `single_mode_skill_need_point`
- `text_data`

No support-card event reward table in the current DB references that skill id.

## Broad table scan

Because the obvious reward/conclusion tables did not contain the mapping, the investigation also scanned all integer columns in all tables for representative values:

- Kitasan SSR story ids: `830028001`, `830028002`, `830028003`
- Kitasan SSR support card id: `30028`
- Known Kitasan event skill id: `200331` (`Professor of Curvature`)

Results for the story ids were limited to:

- `single_mode_story_data`
- `single_mode_conclusion_set`
- `text_data` category `181`

Results for support card id `30028` included support-card ownership/display/gacha/effect tables, but no skill reward relation:

- `single_mode_hint_gain` (hint skills only)
- `single_mode_story_data` (story ids only)
- `single_mode_scout_chara`
- `single_mode_tag_card_pos`
- `support_card_data`
- `support_card_effect_table`
- `support_card_unique_effect`
- `story_event_bonus_support_card`
- gacha/banner/announce/exchange/login bonus/text tables

Tables with both support-card-ish or skill-ish schemas were also reviewed:

- `announce_support_card`
- `available_skill_set`
- `challenge_match_data`
- `fan_raid_bonus_support_card`
- `single_mode_difficulty_data`
- `single_mode_hint_gain`
- `single_mode_restrict_support`
- `single_mode_scout_chara`
- `single_mode_story_data`
- `story_event_bonus_group_support_card`
- `story_event_bonus_support_card`
- `support_card_data`
- `support_card_group`
- `team_building_collection_set`
- NPC/race `skill_set_id` tables

None provide a support-card-event `story_id/support_card_id -> skill_id` mapping.

## Concrete trace: Kitasan SSR final event

Known external/game behavior: SSR Kitasan Black `[Fire at My Heels]` final event `We Walk Together` grants either 1 hint or 3 hints for `Professor of Curvature`.

Master data trace:

```sql
SELECT * FROM text_data WHERE text = 'We Walk Together';
-- category=181, index=830028003

SELECT * FROM single_mode_story_data WHERE story_id = 830028003;
-- support_card_id=30028, show_progress_1=3, show_progress_2=3

SELECT * FROM single_mode_conclusion_set WHERE story_id = 830028003;
-- root_id=0, conclusion_id=1

SELECT * FROM text_data WHERE category = 47 AND text = 'Professor of Curvature';
-- index=200331
```

A full integer-column scan for `830028003` only finds `single_mode_story_data`, `single_mode_conclusion_set`, and `text_data`. A full integer-column scan for `200331` finds skill/mission/NPC/available-skill references, but no row linked to `story_id=830028003` or `support_card_id=30028`.

This confirms the event title and owning support card are in `master.mdb`; the reward branch `Professor of Curvature hint level 1 or 3` is not in the relational master tables available here.

## Conclusion

`master.mdb` provides hint skills directly but does not contain event reward → skill mappings. The gap was resolved by fetching event data from [GameTora's](https://gametora.com/) public manifest API via `fetch-support-events.ts`. See [data-pipeline.md](data-pipeline.md) for how this fits into the full extraction pipeline.
