# Support Card Skill Source Investigation

This note records how support-card skill sources are represented in the Global `master.mdb` snapshot used by the extraction pipeline.

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

Support-card event story metadata is present, but event rewards are not represented as a reliable `story_id -> skill_id` relation in this DB snapshot.

Relevant tables checked:

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

## Current extraction behavior

`extract-support-cards.ts` emits:

```ts
{
  hintSkills: [...],
  eventSkills: [...]
}
```

`eventSkills` behavior:

- Replace mode: emits an empty array because master data does not contain a reliable mapping.
- Merge mode: preserves existing `eventSkills`, so an external/manual mapping can be layered in without changing the JSON schema or downstream consumers.

## If event skills are needed later

Likely next places to investigate are outside `master.mdb`:

1. Story/event asset bundles referenced by the game client.
2. Any extracted story script files that may encode event outcomes/rewards.
3. External curated datasets for support-card event choices and rewards.

Once a source exists, the extractor can merge a map keyed by either `supportCardId` or `storyId` into `eventSkills`.
