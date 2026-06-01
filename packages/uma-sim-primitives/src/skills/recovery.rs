//! Recovery-effect resolution.
//!
//! Ports `skills/recovery-effect-utils.ts`. The only "multiply random" recovery
//! modes supported are `valueUsage` 8 and 9: on activation they roll once and
//! recover (or drain) nothing / a low / a high fraction of the nominal modifier.

use crate::shared_kernel::rng::Prng;
use crate::skills::effect::SkillType;
use crate::skills::model::{RawSkillEffect, SkillEffect};

/// Low multiply-random recovery factor (30% roll).
pub const MULTIPLY_RANDOM_RECOVERY_LOW: f64 = 0.02;
/// High multiply-random recovery factor (10% roll).
pub const MULTIPLY_RANDOM_RECOVERY_HIGH: f64 = 0.04;

const RECOVERY_TYPE_ID: i32 = SkillType::Recovery as i32;

/// Minimal view of an effect needed to resolve recovery.
pub trait RecoveryEffectLike {
    /// Raw effect type id.
    fn effect_type_id(&self) -> i32;
    /// Effect modifier (real units).
    fn modifier(&self) -> f64;
    /// Optional usage discriminator.
    fn value_usage(&self) -> Option<i32>;
}

impl RecoveryEffectLike for SkillEffect {
    fn effect_type_id(&self) -> i32 {
        self.effect_type as i32
    }
    fn modifier(&self) -> f64 {
        self.modifier
    }
    fn value_usage(&self) -> Option<i32> {
        self.value_usage
    }
}

impl RecoveryEffectLike for RawSkillEffect {
    fn effect_type_id(&self) -> i32 {
        self.effect_type
    }
    fn modifier(&self) -> f64 {
        self.modifier
    }
    fn value_usage(&self) -> Option<i32> {
        self.value_usage
    }
}

/// Error returned when a multiply-random recovery effect is resolved without a
/// skill RNG to roll against.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MissingSkillRng;

impl std::fmt::Display for MissingSkillRng {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "skillRng is required to resolve MultiplyRandom recovery effects"
        )
    }
}

impl std::error::Error for MissingSkillRng {}

/// Whether `effect` is a supported "multiply random" recovery effect
/// (`valueUsage` 8 or 9).
pub fn is_supported_multiply_random_recovery<E: RecoveryEffectLike>(effect: &E) -> bool {
    effect.effect_type_id() == RECOVERY_TYPE_ID && matches!(effect.value_usage(), Some(8 | 9))
}

/// Whether `effect` is a supported multiply-random recovery *drain* (negative
/// modifier).
pub fn is_supported_multiply_random_recovery_drain<E: RecoveryEffectLike>(effect: &E) -> bool {
    is_supported_multiply_random_recovery(effect) && effect.modifier() < 0.0
}

/// Resolve the effective recovery modifier, rolling the skill RNG for supported
/// multiply-random effects.
///
/// Port of `resolveRecoveryModifier`:
/// - non-recovery effects pass through unchanged;
/// - a negative modifier with a finite `override` clamps to `-[0,1]`;
/// - unsupported recovery effects pass through unchanged;
/// - supported multiply-random effects roll once: 60% nothing, 30% low, 10% high.
pub fn resolve_recovery_modifier<E: RecoveryEffectLike>(
    effect: &E,
    skill_rng: Option<&mut dyn Prng>,
    override_value: Option<f64>,
) -> Result<f64, MissingSkillRng> {
    if effect.effect_type_id() != RECOVERY_TYPE_ID {
        return Ok(effect.modifier());
    }

    if effect.modifier() < 0.0 {
        if let Some(value) = override_value {
            if value.is_finite() {
                return Ok(-value.clamp(0.0, 1.0));
            }
        }
    }

    if !is_supported_multiply_random_recovery(effect) {
        return Ok(effect.modifier());
    }

    let rng = skill_rng.ok_or(MissingSkillRng)?;
    let roll = rng.random();
    if roll < 0.6 {
        Ok(0.0)
    } else if roll < 0.9 {
        Ok(effect.modifier() * MULTIPLY_RANDOM_RECOVERY_LOW)
    } else {
        Ok(effect.modifier() * MULTIPLY_RANDOM_RECOVERY_HIGH)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared_kernel::rng::Prng;
    use crate::skills::effect::SkillTarget;

    fn recovery_effect(modifier: f64, value_usage: Option<i32>) -> SkillEffect {
        SkillEffect {
            target: SkillTarget::SelfTarget,
            effect_type: SkillType::Recovery,
            base_duration: 0.0,
            modifier,
            value_usage,
            value_level_usage: None,
        }
    }

    /// RNG stub that returns a fixed `random()` value.
    struct FixedRng(f64);
    impl Prng for FixedRng {
        fn int32(&mut self) -> u32 {
            0
        }
        fn random(&mut self) -> f64 {
            self.0
        }
        fn uniform(&mut self, _upper: u32) -> u32 {
            0
        }
    }

    #[test]
    fn supported_detection() {
        assert!(is_supported_multiply_random_recovery(&recovery_effect(
            1.0,
            Some(8)
        )));
        assert!(is_supported_multiply_random_recovery(&recovery_effect(
            1.0,
            Some(9)
        )));
        assert!(!is_supported_multiply_random_recovery(&recovery_effect(
            1.0,
            Some(7)
        )));
        assert!(!is_supported_multiply_random_recovery(&recovery_effect(
            1.0, None
        )));
        assert!(is_supported_multiply_random_recovery_drain(
            &recovery_effect(-1.0, Some(8))
        ));
        assert!(!is_supported_multiply_random_recovery_drain(
            &recovery_effect(1.0, Some(8))
        ));
    }

    #[test]
    fn non_recovery_passes_through() {
        let mut effect = recovery_effect(0.5, Some(8));
        effect.effect_type = SkillType::TargetSpeed;
        assert_eq!(resolve_recovery_modifier(&effect, None, None), Ok(0.5));
    }

    #[test]
    fn override_clamps_negative_modifier() {
        let effect = recovery_effect(-1.0, Some(8));
        assert_eq!(
            resolve_recovery_modifier(&effect, None, Some(0.3)),
            Ok(-0.3)
        );
        assert_eq!(
            resolve_recovery_modifier(&effect, None, Some(5.0)),
            Ok(-1.0)
        );
        assert_eq!(
            resolve_recovery_modifier(&effect, None, Some(-2.0)),
            Ok(0.0)
        );
    }

    #[test]
    fn multiply_random_roll_buckets() {
        let effect = recovery_effect(1.0, Some(8));
        let mut nothing = FixedRng(0.5);
        let mut low = FixedRng(0.7);
        let mut high = FixedRng(0.95);
        assert_eq!(
            resolve_recovery_modifier(&effect, Some(&mut nothing), None),
            Ok(0.0)
        );
        assert_eq!(
            resolve_recovery_modifier(&effect, Some(&mut low), None),
            Ok(0.02)
        );
        assert_eq!(
            resolve_recovery_modifier(&effect, Some(&mut high), None),
            Ok(0.04)
        );
    }

    #[test]
    fn missing_rng_errors_for_supported_effect() {
        let effect = recovery_effect(1.0, Some(8));
        assert_eq!(
            resolve_recovery_modifier(&effect, None, None),
            Err(MissingSkillRng)
        );
    }
}
