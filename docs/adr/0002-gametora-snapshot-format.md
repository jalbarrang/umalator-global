# ADR-0002: Store GameTora Snapshot As-Is Without Normalization

## Status

Accepted

## Context

GameTora serves skill data in a flat format: each skill entry contains its own `condition_groups` with effects inline. Within a skill group (family), conditions are always identical across members — only effect modifiers and sometimes effect count differ (e.g., Demon variants add a second effect).

This means the data has structural redundancy: the same condition string is repeated across every ◎/○/×/Demon member of a family. We considered normalizing into a two-file model (`skill-groups.json` for shared conditions, `skills.json` for per-member effects) matching the domain model more closely.

Additionally, GameTora structures server-specific data as overrides in a `loc` object (e.g., `loc.en` for Global). The top-level fields are JP data. 101 skills currently have different conditions between JP and Global — this is not cosmetic, it affects simulation correctness.

## Decision

Store GameTora's snapshot data as-is in its upstream flat format. No transformation or normalization during fetch.

- Each skill entry retains its own `condition_groups` with effects inline.
- `loc.en` overrides are stored alongside JP top-level data.
- The service layer resolves `loc.en` at load time and derives group relationships from `groupId` at runtime.
- Skill group (family) views are computed by the service, not pre-materialized in the data.

## Consequences

- **Zero transformation code**: fetch writes what GameTora serves, reducing sync bugs.
- **Easy debugging**: local data can be compared directly against GameTora's API responses.
- **Redundant conditions**: the same condition string appears on every family member. This is trivial in size (conditions are short strings) and doesn't affect runtime since the service caches parsed results.
- **Service layer responsibility**: `SkillService` must resolve `loc.en` overrides and group-by-`groupId` at runtime. This is straightforward but means the service is not a thin pass-through.
- **Future option preserved**: normalization can be added later as an optimization if the flat format causes real problems, without changing the upstream fetch pipeline.
