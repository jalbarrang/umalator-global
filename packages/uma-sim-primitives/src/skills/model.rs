//! Skill **value objects** and runtime structs: [`Skill`], [`SkillAlternative`],
//! [`SkillEffect`], and the pending/active trigger types.
//!
//! Ports `skills/skill.types.ts`. The input DTOs ([`Skill`], [`SkillAlternative`],
//! [`RawSkillEffect`]) arrive from the TypeScript data layer and so derive serde
//! with `camelCase` field names. The runtime structs ([`SkillTrigger`],
//! [`PendingSkill`], [`ActiveSkill`], …) live entirely inside the simulation and
//! carry domain types ([`ActivationSamplePolicy`], [`DynamicCondition`]) that do
//! not cross the boundary, so they do not derive serde.

use serde::{Deserialize, Serialize};

use crate::shared_kernel::ids::{RunnerId, SkillId};
use crate::shared_kernel::math::Timer;
use crate::shared_kernel::region::{Region, RegionList};
use crate::skills::activation::ActivationSamplePolicy;
use crate::skills::condition::dynamic::DynamicCondition;
use crate::skills::effect::{SkillRarity, SkillTarget, SkillType, UnknownSkillType};

/// Raw effect as it appears in the skill data, before duration is attached and
/// modifiers are scaled.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawSkillEffect {
    /// Effect strength in raw (×10000) units.
    pub modifier: f64,
    /// Target selector.
    pub target: SkillTarget,
    /// Raw effect type id (mapped to [`SkillType`] when built).
    #[serde(rename = "type")]
    pub effect_type: i32,
    /// Optional usage discriminator (e.g. recovery sub-mode).
    #[serde(default)]
    pub value_usage: Option<i32>,
    /// Optional level-usage discriminator.
    #[serde(default)]
    pub value_level_usage: Option<i32>,
}

/// A single alternative (condition branch) of a skill's effect data.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAlternative {
    /// Base duration in raw (×10000) units.
    pub base_duration: f64,
    /// Optional cooldown between activations (raw units).
    #[serde(default)]
    pub cooldown_time: Option<f64>,
    /// The activation condition DSL string.
    pub condition: String,
    /// Optional precondition DSL string.
    #[serde(default)]
    pub precondition: Option<String>,
    /// Raw effects this alternative applies.
    pub effects: Vec<RawSkillEffect>,
}

/// A skill as loaded from the data layer (input DTO).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    /// Skill identifier.
    pub skill_id: SkillId,
    /// Rarity tier.
    pub rarity: SkillRarity,
    /// Condition branches; the first satisfiable one is used.
    pub alternatives: Vec<SkillAlternative>,
}

/// A built, scaled effect (value object). `base_duration` and `modifier` are in
/// real units (the raw ×10000 values divided by 10000).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillEffect {
    /// Target selector.
    pub target: SkillTarget,
    /// Effect type.
    #[serde(rename = "type")]
    pub effect_type: SkillType,
    /// Effect duration in seconds.
    pub base_duration: f64,
    /// Effect strength in real units.
    pub modifier: f64,
    /// Optional usage discriminator.
    #[serde(default)]
    pub value_usage: Option<i32>,
    /// Optional level-usage discriminator.
    #[serde(default)]
    pub value_level_usage: Option<i32>,
}

/// Build the scaled [`SkillEffect`]s for one alternative.
///
/// Port of `buildSkillEffects`: `base_duration` and every `modifier` are divided
/// by `10000`, and the raw type id is resolved to a [`SkillType`]. Returns an
/// error if any effect carries an unknown type id.
pub fn build_skill_effects(alt: &SkillAlternative) -> Result<Vec<SkillEffect>, UnknownSkillType> {
    let base_duration = alt.base_duration / 10000.0;
    alt.effects
        .iter()
        .map(|effect| {
            Ok(SkillEffect {
                target: effect.target,
                effect_type: SkillType::try_from(effect.effect_type)?,
                base_duration,
                modifier: effect.modifier / 10000.0,
                value_usage: effect.value_usage,
                value_level_usage: effect.value_level_usage,
            })
        })
        .collect()
}

/// Where a targeted (injected) skill originated.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetedSkillOrigin {
    /// Injected externally (e.g. a debuff test harness).
    Injection,
    /// Cast by another runner during the race.
    Runner,
}

/// A skill prepared for activation: its sampled trigger windows plus the runtime
/// predicate that gates it.
///
/// No `PartialEq`: it holds a dynamic-condition closure (see
/// [`DynamicCondition`]). `extra_condition` is `None` when no runtime gate is
/// needed (`kTrue`).
#[derive(Debug, Clone)]
pub struct SkillTrigger {
    /// Skill identifier.
    pub skill_id: SkillId,
    /// Rarity tier (1★/2★ uniques, upgrades, and 3★ uniques differ here).
    pub rarity: SkillRarity,
    /// How activation windows are sampled.
    pub sample_policy: ActivationSamplePolicy,
    /// Candidate activation windows.
    pub regions: RegionList,
    /// Effects applied on activation.
    pub effects: Vec<SkillEffect>,
    /// Extra runtime gate evaluated each tick (`None` == always-true).
    pub extra_condition: Option<DynamicCondition>,
}

/// A skill whose trigger point has been fixed, awaiting the runner reaching it.
///
/// No `PartialEq`: it holds a dynamic-condition closure.
#[derive(Debug, Clone)]
pub struct PendingSkill {
    /// Skill identifier.
    pub skill_id: SkillId,
    /// Rarity tier.
    pub rarity: SkillRarity,
    /// The concrete trigger window.
    pub trigger: Region,
    /// Effects applied on activation.
    pub effects: Vec<SkillEffect>,
    /// Extra runtime gate evaluated each tick (`None` == always-true).
    pub extra_condition: Option<DynamicCondition>,
}

/// A targeted (debuff/ally) skill awaiting its trigger point.
#[derive(Debug, Clone, PartialEq)]
pub struct PendingTargetedSkill {
    /// Skill identifier.
    pub skill_id: SkillId,
    /// Where this targeted skill came from.
    pub origin: TargetedSkillOrigin,
    /// The source runner, when cast by another runner.
    pub source_runner_id: Option<RunnerId>,
    /// The concrete trigger window.
    pub trigger: Region,
    /// Effects applied on activation.
    pub effects: Vec<SkillEffect>,
}

/// A currently-active effect on a runner (duration-based).
#[derive(Debug, Clone, PartialEq)]
pub struct ActiveSkill {
    /// Skill identifier.
    pub skill_id: SkillId,
    /// Remaining-duration timer.
    pub duration_timer: Timer,
    /// Effect strength in real units.
    pub modifier: f64,
    /// Target selector.
    pub effect_target: SkillTarget,
    /// Effect type.
    pub effect_type: SkillType,
    /// Whether the current-speed effect decays naturally on expiry (adds a
    /// one-frame acceleration when it ends).
    pub natural_deceleration: bool,
}

/// A currently-active targeted (debuff/ally) effect on a runner.
#[derive(Debug, Clone, PartialEq)]
pub struct ActiveTargetedSkill {
    /// The underlying active effect.
    pub skill: ActiveSkill,
    /// Where this targeted skill came from.
    pub origin: TargetedSkillOrigin,
    /// The source runner, when cast by another runner.
    pub source_runner_id: Option<RunnerId>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_skill_effects_scales_by_10000() {
        let alt = SkillAlternative {
            base_duration: 30000.0,
            cooldown_time: None,
            condition: "phase>=2".to_owned(),
            precondition: None,
            effects: vec![
                RawSkillEffect {
                    modifier: 4500.0,
                    target: SkillTarget::SelfTarget,
                    effect_type: 27,
                    value_usage: None,
                    value_level_usage: None,
                },
                RawSkillEffect {
                    modifier: -10000.0,
                    target: SkillTarget::All,
                    effect_type: 9,
                    value_usage: Some(8),
                    value_level_usage: None,
                },
            ],
        };
        let effects = build_skill_effects(&alt).expect("known types");
        assert_eq!(effects.len(), 2);
        assert_eq!(effects[0].base_duration, 3.0);
        assert_eq!(effects[0].modifier, 0.45);
        assert_eq!(effects[0].effect_type, SkillType::TargetSpeed);
        assert_eq!(effects[1].modifier, -1.0);
        assert_eq!(effects[1].effect_type, SkillType::Recovery);
        assert_eq!(effects[1].value_usage, Some(8));
    }

    #[test]
    fn build_skill_effects_rejects_unknown_type() {
        let alt = SkillAlternative {
            base_duration: 0.0,
            cooldown_time: None,
            condition: String::new(),
            precondition: None,
            effects: vec![RawSkillEffect {
                modifier: 1.0,
                target: SkillTarget::SelfTarget,
                effect_type: 999,
                value_usage: None,
                value_level_usage: None,
            }],
        };
        assert_eq!(build_skill_effects(&alt), Err(UnknownSkillType(999)));
    }

    #[test]
    fn skill_dto_round_trips_with_camel_case_fields() {
        // The raw JS->domain numeric-enum mapping lives in the wasm `dto.rs`
        // boundary layer; core round-trips through its own symmetric serde
        // representation. This asserts the `camelCase` field naming and the raw
        // `type` rename survive a round trip.
        let skill = Skill {
            skill_id: SkillId::new("100012"),
            rarity: SkillRarity::Gold,
            alternatives: vec![SkillAlternative {
                base_duration: 12000.0,
                cooldown_time: Some(2000.0),
                condition: "phase>=1".to_owned(),
                precondition: None,
                effects: vec![RawSkillEffect {
                    modifier: 3000.0,
                    target: SkillTarget::SelfTarget,
                    effect_type: 27,
                    value_usage: None,
                    value_level_usage: None,
                }],
            }],
        };
        let json = serde_json::to_string(&skill).expect("serialize");
        assert!(json.contains("\"skillId\":"), "json was: {json}");
        assert!(json.contains("\"baseDuration\":12000"));
        assert!(json.contains("\"cooldownTime\":2000"));
        assert!(json.contains("\"type\":27"));

        let reparsed: Skill = serde_json::from_str(&json).expect("parse");
        assert_eq!(reparsed, skill);
    }
}
