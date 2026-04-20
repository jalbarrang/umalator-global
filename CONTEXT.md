# Umalator Global Simulation and Data Catalog

This context covers the simulator's race-domain entities and the extracted game data used to build runner configurations. It exists to keep race concepts distinct from catalog concepts when discussing features like dataset switching and cross-server comparisons.

## Language

**Uma**:
A single Uma Musume participant as a game-domain character.
_Avoid_: Horse girl, racer, unit

**Uma outfit**:
A specific playable outfit/version of a Uma identified by an outfit id.
_Avoid_: Runner, character entry, card

**Runner**:
The simulator's runtime representation of one configured race participant.
_Avoid_: Uma outfit, agent, instance

**Game Data Snapshot**:
A coherent extracted dataset for one release track, such as Global or JP.
_Avoid_: Server, DB mode, region toggle

**Active snapshot**:
The one **Game Data Snapshot** currently used by the UI for browsing, editing, and simulation setup.
_Avoid_: Current server, selected backend

**Snapshot-scoped state**:
Persisted or in-memory UI state that belongs to exactly one **Game Data Snapshot** and must not leak into another.
_Avoid_: Shared cache, global state

**Snapshot catalog**:
The full set of master-derived JSON files loaded for one **Game Data Snapshot**.
_Avoid_: Partial dataset, mixed catalog

**Snapshot bootstrap**:
The startup step that loads the selected **Snapshot catalog** before the app mounts.
_Avoid_: Per-feature lazy loading, ad hoc initialization

**Default snapshot**:
The fallback **Game Data Snapshot** used when resolution fails or no prior selection exists.
_Avoid_: Backup server, implicit mode

**App preference**:
User preference that is independent of any **Game Data Snapshot** and may be shared globally.
_Avoid_: Snapshot data, catalog-backed state

**Snapshot source**:
The maintained extracted files in `public/data/{snapshot}/` that the app boots from at runtime.
_Avoid_: Bundled JSON, live MDB dependency

**Asset fallback**:
A generic visual replacement used when a catalog entry exists but its local image asset does not.
_Avoid_: Data invalidation, hard failure

## Relationships

- A **Runner** is configured from exactly one **Uma outfit**
- A **Uma outfit** belongs to exactly one **Uma**
- A **Uma outfit** exists in one or more **Game Data Snapshots**
- The UI uses exactly one **Active snapshot** at a time for normal editing flows
- All persisted runner/setup state should be **Snapshot-scoped state**
- **App preferences** remain global only when they do not depend on snapshot catalog ids
- Each **Game Data Snapshot** provides exactly one **Snapshot catalog**
- The runtime loads each **Snapshot catalog** from a checked-in **Snapshot source**
- Missing image assets should use **Asset fallback** without changing catalog validity
- The app performs one **Snapshot bootstrap** for the **Active snapshot** before normal UI rendering
- The **Default snapshot** is **global**

## Example dialogue

> **Dev:** "Can users compare a **Runner** that only exists on JP?"
> **Domain expert:** "Not exactly — availability belongs to the **Uma outfit** in a dataset, while the **Runner** is only the simulator instance built from that outfit."
>
> **Dev:** "When I switch from Global to JP, am I changing servers?"
> **Domain expert:** "No — you're changing the **Active snapshot** from one **Game Data Snapshot** to another inside the frontend."

## Flagged ambiguities

- "runner" was used to mean both a simulator participant and a catalog entry — resolved: use **Uma outfit** for cross-dataset availability and **Runner** for the in-simulation entity.
- "server" was used to describe local extracted data variants — resolved: use **Game Data Snapshot** for the extracted dataset and **Active snapshot** for the one currently selected in the UI.
- "shared saved state" would conflict with snapshot isolation — resolved: runner/setup persistence should be **Snapshot-scoped state**, not shared across snapshots.
- "partial switching" would conflict with snapshot coherence — resolved: switching should replace the full **Snapshot catalog**, not just selected files like **Uma outfits** or **skills**.
- "fetched when needed" conflicted with startup simplicity — resolved: v1 should use **Snapshot bootstrap** to load the selected catalog before the app mounts.
- "invalid snapshot handling" could have implied several fallback paths — resolved: the **Default snapshot** is always **global**.
- "saved state" and "preferences" were at risk of being conflated — resolved: catalog-backed ids belong to **Snapshot-scoped state**, while only snapshot-independent **App preferences** stay global.
- "runtime data" and "extraction inputs" were at risk of being conflated — resolved: the app boots from checked-in **Snapshot source** files, while MDB extraction remains a maintainer workflow.
- "missing asset" and "missing data" were at risk of being conflated — resolved: missing images use **Asset fallback** and do not make a catalog entry invalid.
- "comparison" could have meant cross-snapshot diffing — resolved: v1 supports snapshot switching only, and all runner comparisons remain inside the **Active snapshot**.
