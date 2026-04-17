# Ubiquitous Language

## Entities and roles

| Term                   | Definition                                                                                             | Aliases to avoid             |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **Uma**                | A single Uma Musume race participant as a game-domain entity.                                          | Horse girl, racer, unit      |
| **Runner**             | The simulator's runtime representation of one Uma in a race.                                           | Uma instance, agent          |
| **Field**              | The full set of runners participating in a race.                                                       | Lobby, lineup                |
| **9-runner race**      | A race format with exactly nine participants, often used for Champion's Meeting assumptions in guides. | 9-head race, nine-horse race |
| **Champion's Meeting** | A competitive race context that often assumes a 9-runner field in player-facing guides.                | CM, PvP cup                  |

## Strategy and skill taxonomy

| Term                     | Definition                                                                                                                                                       | Aliases to avoid                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Strategy**             | A runner's race style category that affects behavior and coefficients.                                                                                           | Running style, script, role             |
| **Front Runner**         | The strategy that aims to lead from the front (`逃げ`).                                                                                                          | Nige, escape                            |
| **Pace Chaser**          | The strategy that races just off the lead (`先行`).                                                                                                              | Senko, leader-chaser                    |
| **Late Surger**          | The strategy that advances from the middle/back in later phases (`差し`).                                                                                        | Sashi, stalker                          |
| **End Closer**           | The strategy that closes from deep in the field (`追込`).                                                                                                        | Oikomi, deep closer                     |
| **Unique skill**         | A character-specific skill with its own activation conditions and scaling rules.                                                                                 | Ultimate, signature passive             |
| **Speed skill**          | A skill that increases target speed or actual speed.                                                                                                             | Velocity buff, haste                    |
| **Acceleration skill**   | A skill that increases acceleration toward target speed.                                                                                                         | Accel buff, launch skill                |
| **Debuff skill**         | A skill that negatively affects opponents rather than the user.                                                                                                  | Curse, enemy-only skill                 |
| **Recovery skill**       | A skill that restores HP as a percentage of max HP.                                                                                                              | Heal, sustain proc                      |
| **Lane-change skill**    | A skill that modifies lateral movement or target lane behavior.                                                                                                  | Reposition skill, sidestep skill        |
| **Scenario skill**       | A skill whose magnitude depends on scenario-specific progression values.                                                                                         | Mode skill, campaign skill              |
| **Climax skill**         | An older JP/community term for the Trackblazer scenario skill line whose effect magnitude uses the Climax value-scaling rule based on races won during training. | Final-phase skill, endgame skill        |
| **Trackblazer scenario** | The current Global name for the scenario formerly referred to as Climax / Make a New Track, which provides skills like Glittering Star and Radiant Star.         | Climax scenario, MANT, Make a New Track |

## Race phases and race states

| Term                   | Definition                                                                                       | Aliases to avoid                |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| **Early-race**         | The opening phase of the race.                                                                   | Opening, start phase            |
| **Mid-race**           | The middle phase where positioning logic dominates.                                              | Middle, midgame                 |
| **Late-race**          | The race portion after mid-race that includes the homestretch context discussed in guides.       | Back half, endgame, second half |
| **Last spurt state**   | The sprint state where the runner tries to accelerate toward maximum finishing speed if allowed. | Final dash, sprint mode         |
| **Last spurt section** | The homestretch section near the end of the race, treated in docs/guides as part of Late-race.   | Final stretch, homestretch      |
| **Activation point**   | The exact race moment when a skill's conditions are checked and it triggers.                     | Proc frame, trigger tick        |
| **Rushed state**       | The Kakari state that disrupts pacing and alters consumption/behavior.                           | Kakari, temptation, panic       |
| **Blocked**            | A state where nearby runners prevent optimal forward or lateral movement.                        | Jammed, body-blocked            |
| **Front blocked**      | A blocked state caused by a runner directly ahead.                                               | Head blocked, nose blocked      |
| **Side blocked**       | A blocked state caused by a runner preventing lateral movement.                                  | Lane blocked, flank blocked     |
| **Surrounded**         | A state where runners occupy the required front/outside/behind zones around a runner.            | Boxed in, trapped               |
| **Vision**             | The range and cone within which another runner is considered visible.                            | Sight, detection range          |

## Positioning and movement

| Term                 | Definition                                                                  | Aliases to avoid           |
| -------------------- | --------------------------------------------------------------------------- | -------------------------- |
| **Lane**             | A runner's lateral position measured from the inside rail.                  | Track slot, row            |
| **Horse lane**       | A smaller relative lane-width unit used for spacing between runners.        | Mini-lane, sublane         |
| **Target lane**      | The lateral position a runner is currently trying to move toward.           | Desired lane, lane intent  |
| **Lateral movement** | Side-to-side movement across lanes during a race.                           | Strafing, dodging          |
| **Nearby runner**    | A runner close enough to satisfy a skill or race-state proximity condition. | Adjacent runner, near unit |

## Resources and scaling

| Term                       | Definition                                                                                        | Aliases to avoid               |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| **HP**                     | The runner's current or remaining race resource, consumed by running and some skill side effects. | Stamina pool, endurance bar    |
| **Max HP**                 | The runner's starting HP ceiling derived from stamina and race coefficients.                      | Total stamina, full stamina    |
| **Stamina**                | The character stat that contributes to Max HP at race start; it is not the same as current HP.    | HP, endurance                  |
| **Base stat**              | A stat after motivation is applied but before later race adjustments and skill modifiers.         | Raw stat, final stat           |
| **Motivation coefficient** | The multiplier applied from condition/mood when deriving race values.                             | Mood buff, morale bonus        |
| **Green skill bonus**      | A passive stat bonus from green skills included in derived calculations.                          | Passive buff, support bonus    |
| **Duration multiplier**    | A factor that lengthens or shortens a skill's base duration.                                      | Time scaling, extension factor |
| **Effect magnitude**       | The numeric strength of a skill effect.                                                           | Power, potency                 |

## Relationships

- A **Runner** is the simulator representation of exactly one **Uma**.
- Every **Runner** has exactly one **Strategy** during a race.
- A **Unique skill**, **Speed skill**, **Acceleration skill**, **Debuff skill**, **Recovery skill**, or **Lane-change skill** activates at an **Activation point** when its conditions are satisfied.
- **Stamina** contributes to starting **Max HP**, and current **HP** is tracked against that ceiling.
- **Base stat **, raw stat, and final stat are distinct concepts and should not be collapsed into a single term.
- A **Lane-change skill** can alter **Lateral movement**, which changes a runner's **Lane** and sometimes its **Target lane**.
- **Front blocked**, **Side blocked**, and **Surrounded** are distinct race states and should not be used interchangeably.
- **Last spurt state ** and **Last spurt section ** are distinct concepts.
- **Last spurt section ** is discussed as part of **Late-race ** in this project's current terminology.

## Flagged ambiguities

- **"Stamina"** was at risk of being used for both the stat and the in-race resource. Use **Stamina** for the stat, **Max HP** for the ceiling, and **HP ** for the current in-race resource.
- **"Base stat"**, raw stat, and final stat are easy to blur together. Keep them separate when discussing formulas.
- **"Late-race"**, **"back half of the race"**, and **"last spurt"** are easy to blur together. Use **Late-race** for the broader late portion of the race, **Last spurt state** for the sprint behavior, and **Last spurt section** for the homestretch section near the finish.
- **"Climax"** is ambiguous if left alone. In this repo, **Climax skill ** refers to the old JP/community name for the **Trackblazer scenario ** skill line and scaling type, not to the dramatic end of a race.
- **"Strategy"** and **"running style"** refer to the same domain idea. Prefer **Strategy**.
- **"Uma"** and **"Runner"** should not be treated as perfect synonyms. Use **Uma** for the game-domain participant and **Runner** for the simulator/runtime representation.
- **"Blocked"** is too broad when precision matters. Prefer **Front blocked**, **Side blocked**, or **Surrounded** as appropriate.
- **"Lane"** and **"Horse lane"** are distinct units. Use **Lane** for absolute lateral position and **Horse lane** for relative spacing.
