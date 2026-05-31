//! serde boundary DTOs and their conversions to/from domain value objects.
//!
//! This is the **anti-corruption layer**: the JS side speaks numeric enums and
//! camelCase keys; the domain speaks name-based enums and snake_case. All that
//! translation lives here so the core stays serde-light. Conversions are
//! fallible (`Result<_, DtoError>`) — invalid enum codes are reported, never
//! panicked.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use uma_sim_core::application::collectors::CollectedData;
use uma_sim_core::application::simulation::{FinishEntry, RaceSimParams, RaceSimResult};
use uma_sim_core::course::model::{Corner, CourseData, Slope, Straight};
use uma_sim_core::racing::race::SimulationSettings;
use uma_sim_core::racing::runner::lifecycle::{CreateRunner, RunnerAptitudes};
use uma_sim_core::racing::runner::{ForcedRank, ForcedRegion, InjectedDebuff};
use uma_sim_core::shared_kernel::ids::{RunnerId, SkillId};
use uma_sim_core::shared_kernel::language::{
    Aptitude, DistanceType, Grade, GroundCondition, Mood, Orientation, Season, Strategy, Surface,
    ThresholdStat, TimeOfDay, Weather,
};
use uma_sim_core::shared_kernel::params::{RaceParameters, SimulationMode, StatLine};
use uma_sim_core::skills::effect::{SkillRarity, SkillTarget};
use uma_sim_core::skills::model::{RawSkillEffect, Skill, SkillAlternative};

/// An invalid value crossing the JS boundary.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DtoError(pub String);

impl std::fmt::Display for DtoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for DtoError {}

fn invalid(kind: &str, value: i32) -> DtoError {
    DtoError(format!("invalid {kind} code: {value}"))
}

// --------- enum converters (numeric -> domain) ---------

fn to_surface(v: i32) -> Result<Surface, DtoError> {
    match v {
        1 => Ok(Surface::Turf),
        2 => Ok(Surface::Dirt),
        _ => Err(invalid("surface", v)),
    }
}

fn to_distance_type(v: i32) -> Result<DistanceType, DtoError> {
    match v {
        1 => Ok(DistanceType::Short),
        2 => Ok(DistanceType::Mile),
        3 => Ok(DistanceType::Mid),
        4 => Ok(DistanceType::Long),
        _ => Err(invalid("distanceType", v)),
    }
}

fn to_orientation(v: i32) -> Result<Orientation, DtoError> {
    match v {
        1 => Ok(Orientation::Clockwise),
        2 => Ok(Orientation::Counterclockwise),
        3 => Ok(Orientation::UnusedOrientation),
        4 => Ok(Orientation::NoTurns),
        _ => Err(invalid("turn", v)),
    }
}

fn to_threshold_stat(v: i32) -> Result<ThresholdStat, DtoError> {
    match v {
        1 => Ok(ThresholdStat::Speed),
        2 => Ok(ThresholdStat::Stamina),
        3 => Ok(ThresholdStat::Power),
        4 => Ok(ThresholdStat::Guts),
        5 => Ok(ThresholdStat::Wit),
        _ => Err(invalid("courseSetStatus", v)),
    }
}

fn to_strategy(v: i32) -> Result<Strategy, DtoError> {
    match v {
        1 => Ok(Strategy::FrontRunner),
        2 => Ok(Strategy::PaceChaser),
        3 => Ok(Strategy::LateSurger),
        4 => Ok(Strategy::EndCloser),
        5 => Ok(Strategy::Runaway),
        _ => Err(invalid("strategy", v)),
    }
}

fn to_mood(v: i32) -> Result<Mood, DtoError> {
    match v {
        -2 => Ok(Mood::Awful),
        -1 => Ok(Mood::Bad),
        0 => Ok(Mood::Normal),
        1 => Ok(Mood::Good),
        2 => Ok(Mood::Great),
        _ => Err(invalid("mood", v)),
    }
}

fn to_aptitude(v: i32) -> Result<Aptitude, DtoError> {
    match v {
        0 => Ok(Aptitude::S),
        1 => Ok(Aptitude::A),
        2 => Ok(Aptitude::B),
        3 => Ok(Aptitude::C),
        4 => Ok(Aptitude::D),
        5 => Ok(Aptitude::E),
        6 => Ok(Aptitude::F),
        7 => Ok(Aptitude::G),
        _ => Err(invalid("aptitude", v)),
    }
}

fn to_ground(v: i32) -> Result<GroundCondition, DtoError> {
    match v {
        1 => Ok(GroundCondition::Firm),
        2 => Ok(GroundCondition::Good),
        3 => Ok(GroundCondition::Soft),
        4 => Ok(GroundCondition::Heavy),
        _ => Err(invalid("ground", v)),
    }
}

fn to_weather(v: i32) -> Result<Weather, DtoError> {
    match v {
        1 => Ok(Weather::Sunny),
        2 => Ok(Weather::Cloudy),
        3 => Ok(Weather::Rainy),
        4 => Ok(Weather::Snowy),
        _ => Err(invalid("weather", v)),
    }
}

fn to_season(v: i32) -> Result<Season, DtoError> {
    match v {
        1 => Ok(Season::Spring),
        2 => Ok(Season::Summer),
        3 => Ok(Season::Autumn),
        4 => Ok(Season::Winter),
        5 => Ok(Season::Sakura),
        _ => Err(invalid("season", v)),
    }
}

fn to_time_of_day(v: i32) -> Result<TimeOfDay, DtoError> {
    match v {
        0 => Ok(TimeOfDay::NoTime),
        1 => Ok(TimeOfDay::Morning),
        2 => Ok(TimeOfDay::Midday),
        3 => Ok(TimeOfDay::Evening),
        4 => Ok(TimeOfDay::Night),
        _ => Err(invalid("timeOfDay", v)),
    }
}

fn to_grade(v: i32) -> Result<Grade, DtoError> {
    match v {
        100 => Ok(Grade::G1),
        200 => Ok(Grade::G2),
        300 => Ok(Grade::G3),
        400 => Ok(Grade::Op),
        700 => Ok(Grade::PreOp),
        800 => Ok(Grade::Maiden),
        900 => Ok(Grade::Debut),
        999 => Ok(Grade::Daily),
        _ => Err(invalid("grade", v)),
    }
}

fn to_sim_mode(v: &str) -> SimulationMode {
    if v.eq_ignore_ascii_case("compare") {
        SimulationMode::Compare
    } else {
        SimulationMode::Normal
    }
}

fn to_rarity(v: i32) -> Result<SkillRarity, DtoError> {
    match v {
        1 => Ok(SkillRarity::White),
        2 => Ok(SkillRarity::Gold),
        // 1*/2* uniques, upgrades, and natural 3* uniques all collapse to Unique.
        3..=5 => Ok(SkillRarity::Unique),
        6 => Ok(SkillRarity::Evolution),
        _ => Err(invalid("rarity", v)),
    }
}

fn to_target(v: i32) -> Result<SkillTarget, DtoError> {
    match v {
        // The source data uses 0 for plain self-targeted effects.
        0..=1 => Ok(SkillTarget::SelfTarget),
        2 => Ok(SkillTarget::All),
        4 => Ok(SkillTarget::InFov),
        7 => Ok(SkillTarget::AheadOfPosition),
        9 => Ok(SkillTarget::AheadOfSelf),
        10 => Ok(SkillTarget::BehindSelf),
        11 => Ok(SkillTarget::AllAllies),
        18 => Ok(SkillTarget::EnemyStrategy),
        19 => Ok(SkillTarget::KakariAhead),
        20 => Ok(SkillTarget::KakariBehind),
        21 => Ok(SkillTarget::KakariStrategy),
        22 => Ok(SkillTarget::UmaId),
        23 => Ok(SkillTarget::UsedRecovery),
        _ => Err(invalid("skillTarget", v)),
    }
}

// --------- input DTOs ---------

/// A course corner.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmCorner {
    /// Corner start position.
    pub start: f64,
    /// Corner length.
    pub length: f64,
}

/// A course straight.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmStraight {
    /// Straight start position.
    pub start: f64,
    /// Straight end position.
    pub end: f64,
    /// Opaque front-type classifier from the source data.
    #[serde(default)]
    pub front_type: i32,
}

/// A course slope.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmSlope {
    /// Slope start position.
    pub start: f64,
    /// Slope length.
    pub length: f64,
    /// Slope grade (positive uphill, negative downhill).
    pub slope: f64,
}

/// Course geometry as it crosses the boundary.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmCourseData {
    /// Course id.
    pub course_id: u32,
    /// Race track id.
    pub race_track_id: u32,
    /// Total distance in meters.
    pub distance: f64,
    /// Distance bucket (numeric).
    pub distance_type: i32,
    /// Surface (numeric).
    pub surface: i32,
    /// Orientation (numeric).
    pub turn: i32,
    /// Course "set status" bonus stats (numeric).
    #[serde(default)]
    pub course_set_status: Vec<i32>,
    /// Corners.
    #[serde(default)]
    pub corners: Vec<WasmCorner>,
    /// Straights.
    #[serde(default)]
    pub straights: Vec<WasmStraight>,
    /// Slopes.
    #[serde(default)]
    pub slopes: Vec<WasmSlope>,
    /// Maximum lane index.
    pub lane_max: f64,
    /// Course width.
    pub course_width: f64,
    /// Per-horse lane width.
    pub horse_lane: f64,
    /// Lane-change acceleration.
    pub lane_change_acceleration: f64,
    /// Lane-change acceleration per frame.
    pub lane_change_acceleration_per_frame: f64,
    /// Maximum lane distance.
    pub max_lane_distance: f64,
    /// Lane-change point.
    pub move_lane_point: f64,
}

impl WasmCourseData {
    /// Convert to the domain [`CourseData`].
    pub fn into_domain(self) -> Result<CourseData, DtoError> {
        let course_set_status = self
            .course_set_status
            .into_iter()
            .map(to_threshold_stat)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(CourseData {
            course_id: self.course_id,
            race_track_id: self.race_track_id,
            distance: self.distance,
            distance_type: to_distance_type(self.distance_type)?,
            surface: to_surface(self.surface)?,
            turn: to_orientation(self.turn)?,
            course_set_status,
            corners: self
                .corners
                .into_iter()
                .map(|c| Corner {
                    start: c.start,
                    length: c.length,
                })
                .collect(),
            straights: self
                .straights
                .into_iter()
                .map(|s| Straight {
                    start: s.start,
                    end: s.end,
                    front_type: s.front_type,
                })
                .collect(),
            slopes: self
                .slopes
                .into_iter()
                .map(|s| Slope {
                    start: s.start,
                    length: s.length,
                    slope: s.slope,
                })
                .collect(),
            lane_max: self.lane_max,
            course_width: self.course_width,
            horse_lane: self.horse_lane,
            lane_change_acceleration: self.lane_change_acceleration,
            lane_change_acceleration_per_frame: self.lane_change_acceleration_per_frame,
            max_lane_distance: self.max_lane_distance,
            move_lane_point: self.move_lane_point,
        })
    }
}

/// Five core stats.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct WasmStatLine {
    /// Speed.
    pub speed: i32,
    /// Stamina.
    pub stamina: i32,
    /// Power.
    pub power: i32,
    /// Guts.
    pub guts: i32,
    /// Wit.
    pub wit: i32,
}

impl From<WasmStatLine> for StatLine {
    fn from(s: WasmStatLine) -> Self {
        StatLine {
            speed: s.speed,
            stamina: s.stamina,
            power: s.power,
            guts: s.guts,
            wit: s.wit,
        }
    }
}

/// Aptitudes (numeric).
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct WasmAptitudes {
    /// Distance aptitude.
    pub distance: i32,
    /// Strategy aptitude.
    pub strategy: i32,
    /// Surface aptitude.
    pub surface: i32,
}

impl WasmAptitudes {
    fn into_domain(self) -> Result<RunnerAptitudes, DtoError> {
        Ok(RunnerAptitudes {
            distance: to_aptitude(self.distance)?,
            strategy: to_aptitude(self.strategy)?,
            surface: to_aptitude(self.surface)?,
        })
    }
}

/// A raw skill effect (numeric type/target).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmRawEffect {
    /// Raw modifier (×10000 units).
    pub modifier: f64,
    /// Target selector (numeric).
    pub target: i32,
    /// Effect type id.
    #[serde(rename = "type")]
    pub effect_type: i32,
    /// Optional usage discriminator.
    #[serde(default)]
    pub value_usage: Option<i32>,
    /// Optional level-usage discriminator.
    #[serde(default)]
    pub value_level_usage: Option<i32>,
}

impl WasmRawEffect {
    fn into_domain(self) -> Result<RawSkillEffect, DtoError> {
        Ok(RawSkillEffect {
            modifier: self.modifier,
            target: to_target(self.target)?,
            effect_type: self.effect_type,
            value_usage: self.value_usage,
            value_level_usage: self.value_level_usage,
        })
    }
}

/// A skill condition branch.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmSkillAlternative {
    /// Base duration (×10000 units).
    pub base_duration: f64,
    /// Optional cooldown.
    #[serde(default)]
    pub cooldown_time: Option<f64>,
    /// Activation condition DSL.
    pub condition: String,
    /// Optional precondition DSL.
    #[serde(default)]
    pub precondition: Option<String>,
    /// Raw effects.
    pub effects: Vec<WasmRawEffect>,
}

impl WasmSkillAlternative {
    fn into_domain(self) -> Result<SkillAlternative, DtoError> {
        Ok(SkillAlternative {
            base_duration: self.base_duration,
            cooldown_time: self.cooldown_time,
            condition: self.condition,
            precondition: self.precondition,
            effects: self
                .effects
                .into_iter()
                .map(WasmRawEffect::into_domain)
                .collect::<Result<Vec<_>, _>>()?,
        })
    }
}

/// A pre-resolved skill (the TS data layer resolves alternatives + raw
/// conditions and ships them here).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmSkillInput {
    /// Skill id (may carry a `-suffix`).
    pub skill_id: String,
    /// Rarity (numeric).
    pub rarity: i32,
    /// Condition branches.
    pub alternatives: Vec<WasmSkillAlternative>,
}

impl WasmSkillInput {
    fn into_domain(self) -> Result<Skill, DtoError> {
        Ok(Skill {
            skill_id: SkillId::new(self.skill_id),
            rarity: to_rarity(self.rarity)?,
            alternatives: self
                .alternatives
                .into_iter()
                .map(WasmSkillAlternative::into_domain)
                .collect::<Result<Vec<_>, _>>()?,
        })
    }
}

/// A debuff injected onto a runner at a fixed position (compare mode).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmInjectedDebuff {
    /// The pre-resolved debuff skill.
    pub skill: WasmSkillInput,
    /// Position at which the debuff fires.
    pub position: f64,
}

/// A scripted `[start, end)` region (rushed / dueling / spot-struggle).
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmForcedRegion {
    /// Region start position.
    pub start: f64,
    /// Region end position.
    pub end: f64,
}

/// A scripted forced-rank region.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmForcedRank {
    /// Region start position.
    pub start: f64,
    /// Region end position.
    pub end: f64,
    /// 1-based rank to pin while inside the region.
    pub rank: i64,
}

/// A runner to add to the field.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmCreateRunner {
    /// Outfit (costume) id.
    pub outfit_id: String,
    /// Display name.
    pub name: String,
    /// Mood (numeric).
    pub mood: i32,
    /// Strategy (numeric).
    pub strategy: i32,
    /// Aptitudes.
    pub aptitudes: WasmAptitudes,
    /// Raw stats.
    pub stats: WasmStatLine,
    /// Pre-resolved skills.
    #[serde(default)]
    pub skills: Vec<WasmSkillInput>,
    /// Skill-base-id -> forced activation position.
    #[serde(default)]
    pub forced_positions: HashMap<String, f64>,
    /// Injected debuffs (compare mode).
    #[serde(default)]
    pub injected_debuffs: Vec<WasmInjectedDebuff>,
    /// Scripted rushed regions.
    #[serde(default)]
    pub forced_rushed_regions: Vec<WasmForcedRegion>,
    /// Scripted dueling regions.
    #[serde(default)]
    pub forced_dueling_regions: Vec<WasmForcedRegion>,
    /// Scripted spot-struggle regions.
    #[serde(default)]
    pub forced_spot_struggle_regions: Vec<WasmForcedRegion>,
    /// Scripted forced-rank regions.
    #[serde(default)]
    pub forced_rank: Vec<WasmForcedRank>,
}

impl WasmCreateRunner {
    fn into_domain(self) -> Result<CreateRunner, DtoError> {
        Ok(CreateRunner {
            outfit_id: self.outfit_id,
            name: self.name,
            mood: to_mood(self.mood)?,
            strategy: to_strategy(self.strategy)?,
            aptitudes: self.aptitudes.into_domain()?,
            stats: self.stats.into(),
            skills: self
                .skills
                .into_iter()
                .map(WasmSkillInput::into_domain)
                .collect::<Result<Vec<_>, _>>()?,
            forced_positions: self.forced_positions,
            injected_debuffs: self
                .injected_debuffs
                .into_iter()
                .map(|d| {
                    Ok::<_, DtoError>(InjectedDebuff {
                        skill: d.skill.into_domain()?,
                        position: d.position,
                    })
                })
                .collect::<Result<Vec<_>, _>>()?,
            forced_rushed_regions: self
                .forced_rushed_regions
                .into_iter()
                .map(|r| ForcedRegion {
                    start: r.start,
                    end: r.end,
                })
                .collect(),
            forced_dueling_regions: self
                .forced_dueling_regions
                .into_iter()
                .map(|r| ForcedRegion {
                    start: r.start,
                    end: r.end,
                })
                .collect(),
            forced_spot_struggle_regions: self
                .forced_spot_struggle_regions
                .into_iter()
                .map(|r| ForcedRegion {
                    start: r.start,
                    end: r.end,
                })
                .collect(),
            forced_rank: self
                .forced_rank
                .into_iter()
                .map(|r| ForcedRank {
                    start: r.start,
                    end: r.end,
                    rank: r.rank,
                })
                .collect(),
        })
    }
}

/// Race-wide parameters.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmRaceParameters {
    /// Ground condition (numeric).
    pub ground: i32,
    /// Weather (numeric).
    pub weather: i32,
    /// Season (numeric).
    pub season: i32,
    /// Time of day (numeric).
    pub time_of_day: i32,
    /// Grade (numeric).
    pub grade: i32,
}

impl WasmRaceParameters {
    fn to_domain(&self, mode: SimulationMode) -> Result<RaceParameters, DtoError> {
        Ok(RaceParameters {
            ground: to_ground(self.ground)?,
            weather: to_weather(self.weather)?,
            season: to_season(self.season)?,
            time_of_day: to_time_of_day(self.time_of_day)?,
            grade: to_grade(self.grade)?,
            num_umas: None,
            order_range: None,
            skill_id: None,
            strategy_counts: None,
            common_skills: None,
            mode,
        })
    }
}

/// Optional simulation toggles (all default to the normal-mode defaults).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmSettings {
    /// Mode string (`"normal"` or `"compare"`).
    #[serde(default)]
    pub mode: Option<String>,
    /// HP system.
    #[serde(default)]
    pub health_system: Option<bool>,
    /// Rushed mechanic.
    #[serde(default)]
    pub rushed: Option<bool>,
    /// Downhill mode.
    #[serde(default)]
    pub downhill: Option<bool>,
    /// Spot struggle.
    #[serde(default)]
    pub spot_struggle: Option<bool>,
    /// Dueling.
    #[serde(default)]
    pub dueling: Option<bool>,
    /// Wit checks.
    #[serde(default)]
    pub wit_checks: Option<bool>,
    /// Skill sample budget.
    #[serde(default)]
    pub skill_samples: Option<usize>,
}

impl WasmSettings {
    fn into_domain(self) -> SimulationSettings {
        let mut s = SimulationSettings::default();
        if let Some(mode) = &self.mode {
            s.mode = to_sim_mode(mode);
        }
        if let Some(v) = self.health_system {
            s.health_system = v;
        }
        if let Some(v) = self.rushed {
            s.rushed = v;
        }
        if let Some(v) = self.downhill {
            s.downhill = v;
        }
        if let Some(v) = self.spot_struggle {
            s.spot_struggle = v;
        }
        if let Some(v) = self.dueling {
            s.dueling = v;
        }
        if let Some(v) = self.wit_checks {
            s.wit_checks = v;
        }
        if let Some(v) = self.skill_samples {
            s.skill_samples = v.max(1);
        }
        s
    }
}

/// Inputs to a batch simulation run.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmRaceSimParams {
    /// The course.
    pub course: WasmCourseData,
    /// Race parameters.
    pub parameters: WasmRaceParameters,
    /// Optional settings.
    #[serde(default)]
    pub settings: WasmSettings,
    /// The 9 runners.
    pub runners: Vec<WasmCreateRunner>,
    /// Number of rounds.
    pub nsamples: usize,
    /// Master seed.
    pub master_seed: u64,
    /// Focus runner ids whose telemetry is collected.
    #[serde(default)]
    pub focus_runner_ids: Vec<u32>,
}

impl WasmRaceSimParams {
    /// Convert to the domain [`RaceSimParams`].
    pub fn into_domain(self) -> Result<RaceSimParams, DtoError> {
        let settings = self.settings.into_domain();
        let parameters = self.parameters.to_domain(settings.mode)?;
        let ground = to_ground(self.parameters.ground)?;
        let course = self.course.into_domain()?;
        let runners = self
            .runners
            .into_iter()
            .map(WasmCreateRunner::into_domain)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(RaceSimParams {
            course,
            ground,
            parameters,
            settings,
            runners,
            nsamples: self.nsamples,
            master_seed: self.master_seed,
            focus_runner_ids: self.focus_runner_ids.into_iter().map(RunnerId).collect(),
        })
    }
}

// --------- output DTOs ---------

/// A finishing record crossing back to JS.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmFinishEntry {
    /// Runner id.
    pub runner_id: u32,
    /// Display name.
    pub name: String,
    /// Strategy (numeric).
    pub strategy: i32,
    /// Final position.
    pub finish_position: f64,
    /// Finish time in seconds.
    pub finish_time: f64,
}

impl From<&FinishEntry> for WasmFinishEntry {
    fn from(e: &FinishEntry) -> Self {
        WasmFinishEntry {
            runner_id: e.runner_id.0,
            name: e.name.clone(),
            strategy: e.strategy as i32,
            finish_position: e.finish_position,
            finish_time: e.finish_time,
        }
    }
}

/// A per-tick focus sample crossing back to JS.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmTickSample {
    /// Time in seconds.
    pub time: f64,
    /// Position in meters.
    pub position: f64,
    /// Speed in m/s.
    pub speed: f64,
    /// Lane offset.
    pub lane: f64,
    /// Remaining HP.
    pub health: f64,
}

/// A focus runner's trace for a round.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmFocusTrace {
    /// Runner id.
    pub runner_id: u32,
    /// Per-tick samples.
    pub samples: Vec<WasmTickSample>,
}

/// One round's collected data.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmRoundData {
    /// Round seed.
    pub seed: u64,
    /// Focus traces.
    pub focus: Vec<WasmFocusTrace>,
}

/// The serialized simulation result.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmRaceSimResult {
    /// Per-round finish orders.
    pub finish_orders: Vec<Vec<WasmFinishEntry>>,
    /// Collected focus telemetry.
    pub collected: Vec<WasmRoundData>,
}

impl WasmRaceSimResult {
    /// Build the output DTO from a domain result.
    pub fn from_domain(result: &RaceSimResult) -> Self {
        WasmRaceSimResult {
            finish_orders: result
                .finish_orders
                .iter()
                .map(|order| order.iter().map(WasmFinishEntry::from).collect())
                .collect(),
            collected: collected_to_wasm(&result.collected),
        }
    }
}

fn collected_to_wasm(data: &CollectedData) -> Vec<WasmRoundData> {
    data.rounds
        .iter()
        .map(|round| WasmRoundData {
            seed: round.seed,
            focus: round
                .focus
                .iter()
                .map(|trace| WasmFocusTrace {
                    runner_id: trace.runner_id.0,
                    samples: trace
                        .samples
                        .iter()
                        .map(|s| WasmTickSample {
                            time: s.time,
                            position: s.position,
                            speed: s.speed,
                            lane: s.lane,
                            health: s.health,
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect()
}
