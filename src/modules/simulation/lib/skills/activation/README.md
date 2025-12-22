# Activation Conditions

This directory contains the implementation of skill activation conditions for the Uma Musume race simulation.

## Overview

Skill activation conditions determine when and where skills can be triggered during a race. Each condition can filter race regions and check dynamic race states to determine if a skill should activate.

## Implementation Status

✅ = Fully implemented
⚠️ = Partially implemented (noop placeholder)
❌ = Not implemented

---

## List of Conditions

### Time & Progress

#### `accumulatetime` ✅

**Description:** The number of seconds since the race has started.
**Example:** `accumulatetime>=5`
**Meaning:** The race has been ongoing for at least 5 seconds.
**Implemented in:** `conditions/activation.ts`

#### `distance_rate` ✅

**Description:** Race progression in percentage.
**Example:** `distance_rate>=50`
**Meaning:** Race is in its half or later.
**Implemented in:** `conditions/distance.ts`

#### `distance_rate_after_random` ✅

**Description:** Picks a random point after the specified point in the race.
**Example:** `distance_rate_after_random==50`
**Meaning:** Picks a random point in the second half (i.e. after 50%) of the race.
**Implemented in:** `conditions/distance.ts`

#### `remain_distance` ✅

**Description:** The number of meters remaining in the race.
**Example:** `remain_distance==200`
**Meaning:** There are exactly 200 meters remaining in the race.
**Implemented in:** `conditions/distance.ts`

#### `remain_distance_viewer_id` ❌

**Description:** The number of meters remaining in the race for any player character.
**Example:** `remain_distance_viewer_id<=850`
**Meaning:** Any non-NPC character has reached the last 850 meters in the race.
**Not implemented**

---

### Skill Activation Counters

#### `activate_count_all` ✅

**Description:** The number of skills you have activated in the race.
**Example:** `activate_count_all>=7`
**Meaning:** You have activated at least 7 skills so far.
**Implemented in:** `conditions/activation.ts`

#### `activate_count_all_team` ❌

**Description:** The characters on your team have cumulatively activated the specified number of skills.
**Example:** `activate_count_all_team>=10`
**Meaning:** The characters on your team have cumulatively activated 10 skills or more.
**Not implemented**

#### `activate_count_end_after` ✅

**Description:** The number of skills you have activated in the Late-Race or later.
**Example:** `activate_count_end_after>=3`
**Meaning:** You've activated at least 3 skills during the Late-Race or the Last Spurt.
**Implemented in:** `conditions/activation.ts`

#### `activate_count_heal` ✅

**Description:** The number of recovery (healing) skills you have activated during the race.
**Example:** `activate_count_heal>=1`
**Meaning:** You have activated at least one recovery skill during the race.
**Implemented in:** `conditions/activation.ts`

#### `activate_count_later_half` ❌

**Description:** You've activated the specified amount of skills in the second half of the race.
**Example:** `activate_count_later_half>=2`
**Meaning:** You've activated at least 2 skills in the second half of the race.
**Not implemented**

#### `activate_count_middle` ✅

**Description:** The number of skills you have activated in the Mid-Race.
**Example:** `activate_count_middle>=3`
**Meaning:** You've activated at least 3 skills during the Mid-Race.
**Implemented in:** `conditions/activation.ts`

#### `activate_count_start` ✅

**Description:** The number of skills you have activated in the Early-Race.
**Example:** `activate_count_start>=3`
**Meaning:** You've activated at least 3 skills during the Early-Race.
**Implemented in:** `conditions/activation.ts`

#### `is_activate_any_skill` ❌

**Description:** Checks if any other skill has just been activated.
**Example:** `is_activate_any_skill==1`
**Meaning:** You have just used another skill.
**Not implemented**

#### `is_activate_heal_skill` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `is_activate_other_skill_detail` ✅

**Description:** A different trigger of this skill was activated during the race.
**Example:** `is_activate_other_skill_detail==1`
**Meaning:** You activated "Trigger 1" of this skill at some earlier point of the race.
**Implemented in:** `conditions/gate-random.ts`

#### `is_used_skill_id` ✅

**Description:** Checks whether you've activated a specific skill during this race.
**Example:** `is_used_skill_id==202051`
**Meaning:** You've activated the Great Escape skill during this race.
**Implemented in:** `conditions/gate-random.ts`

---

### Position & Order

#### `order` ✅

**Description:** Your current position in the race.
**Example:** `order<=3`
**Meaning:** You're currently first, second, or third.
**Implemented in:** `conditions/position.ts`

#### `order_rate` ✅

**Description:** Your current position in the race as a percentage.
**Example:** `order_rate>=50`
**Meaning:** You're in the second half of the pack.
**Note:** Converted to the nearest integer first. For example, order_rate > 50 in a 9-uma race would be x > round(9\*50%) => x > round(4.5) => x > 5. So your position needs to be 6th or worse.
**Implemented in:** `conditions/position.ts`

#### `order_rate_in20_continue` ✅

**Description:** Your position has been within the top 20% for the entire race until now.
**Example:** `order_rate_in20_continue==1`
**Meaning:** Your position in the race was never worse than top 20% after the first 5 seconds (for example, in a 10-uma race, you were never worse than 2nd).
**Implemented in:** `conditions/position.ts`

#### `order_rate_in40_continue` ✅

**Description:** Your position has been within the top 40% for the entire race until now.
**Example:** `order_rate_in40_continue==1`
**Meaning:** Your position in the race was never worse than top 40% after the first 5 seconds (for example, in a 10-uma race, you were never worse than 4th).
**Implemented in:** `conditions/position.ts`

#### `order_rate_in50_continue` ✅

**Description:** Your position has been within the top 50% for the entire race until now.
**Example:** `order_rate_in50_continue==1`
**Meaning:** Your position in the race was never worse than top 50% after the first 5 seconds (for example, in a 10-uma race, you were never worse than 5th).
**Implemented in:** `conditions/position.ts`

#### `order_rate_in80_continue` ✅

**Description:** Your position has been within the top 80% for the entire race until now.
**Example:** `order_rate_in80_continue==1`
**Meaning:** Your position in the race was never worse than top 80% after the first 5 seconds (for example, in a 10-uma race, you were never worse than 8th).
**Implemented in:** `conditions/position.ts`

#### `order_rate_out20_continue` ✅

**Description:** Your position has been worse than the top 20% for the entire race until now.
**Example:** `order_rate_out20_continue==1`
**Meaning:** Your position in the race was always outside of the top 20% (so within the last 80%). For example, in a 9-uma race, you were always 2nd or worse.
**Implemented in:** `conditions/position.ts`

#### `order_rate_out40_continue` ✅

**Description:** Your position has been worse than the top 40% for the entire race until now.
**Example:** `order_rate_out40_continue==1`
**Meaning:** Your position in the race was always outside of the top 40% (so within the last 60%). For example, in a 9-uma race, you were always 4th or worse.
**Implemented in:** `conditions/position.ts`

#### `order_rate_out50_continue` ✅

**Description:** Your position has been worse than the top 50% for the entire race until now.
**Example:** `order_rate_out50_continue==1`
**Meaning:** Your position in the race was always outside of the top 50% (so within the last 50%). For example, in a 9-uma race, you were always 5th or worse.
**Implemented in:** `conditions/position.ts`

#### `order_rate_out70_continue` ✅

**Description:** Your position has been worse than the top 70% for the entire race until now.
**Example:** `order_rate_out70_continue==1`
**Meaning:** Your position in the race was always outside of the top 70% (so within the last 30%). For example, in a 9-uma race, you were always 7th or worse.
**Implemented in:** `conditions/position.ts`

---

### Order Changes & Overtaking

#### `change_order_onetime` ⚠️

**Description:** Checks if your position in the race has changed.
**Example:** `change_order_onetime<0`
**Meaning:** You've overtaken another uma.
**Note:** Positive number means being overtaken, negative number means overtaking someone.
**Implemented in:** `conditions/order-change.ts` (noop placeholder)

#### `change_order_up_end_after` ⚠️

**Description:** Checks how many times you've overtaken someone after entering the Late-Race.
**Example:** `change_order_up_end_after>=3`
**Meaning:** You have overtaken another girl at least 3 times since entering the Late-Race.
**Implemented in:** `conditions/order-change.ts` (erlang random)

#### `change_order_up_finalcorner_after` ⚠️

**Description:** Checks how many times you've overtaken someone after entering the Final Corner.
**Example:** `change_order_up_finalcorner_after>=3`
**Meaning:** You have overtaken another girl at least 3 times since entering the Final Corner.
**Implemented in:** `conditions/order-change.ts` (erlang random)

#### `change_order_up_middle` ⚠️

**Description:** Checks how many times you've overtaken someone during the Mid-Race.
**Example:** `change_order_up_middle>=3`
**Meaning:** You have overtaken another girl at least 3 times during the Mid-Race.
**Implemented in:** `conditions/order-change.ts` (erlang random)

#### `is_overtake` ⚠️

**Description:** Checks if you have any overtake targets.
**Example:** `is_overtake==1`
**Meaning:** You have at least one overtake target.
**Note:** A girl is an overtake target if she's up to 20 meters ahead of you, and you can catch up with her within 15 seconds at the current speed.
**Implemented in:** `conditions/order-change.ts` (noop placeholder)

#### `overtake_target_no_order_up_time` ⚠️

**Description:** The number of seconds you've had any overtake targets.
**Example:** `overtake_target_no_order_up_time>=2`
**Meaning:** You've had at least one overtake target for at least two seconds.
**Implemented in:** `conditions/order-change.ts` (noop placeholder)

#### `overtake_target_time` ⚠️

**Description:** The number of seconds you've been an overtake target.
**Example:** `overtake_target_time>=2`
**Meaning:** You've been an overtake target for at least 2 seconds.
**Note:** You're an overtake target of another girl if you're up to 20 meters ahead of her, and if she can catch up with you within 15 seconds at the current speed.
**Implemented in:** `conditions/order-change.ts` (noop placeholder)

---

### Distance & Positioning

#### `bashin_diff_behind` ⚠️

**Description:** Horse lengths between you and the closest uma behind you.
**Example:** `bashin_diff_behind<=1`
**Meaning:** There's another uma at most one horse length behind you.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `bashin_diff_infront` ⚠️

**Description:** Horse lengths between you and the closest uma ahead of you.
**Example:** `bashin_diff_infront<=1`
**Meaning:** There's another uma at most one horse length ahead of you.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `distance_diff_rate` ⚠️

**Description:** Your position between the currently first and the currently last girl as a percentage.
**Example:** `distance_diff_rate<=30`
**Meaning:** If there's a 100-meter gap between the first and the last uma, you're no further than 30 meters behind the first one.
**Implemented in:** `conditions/distance.ts` (noop placeholder)

#### `distance_diff_top` ⚠️

**Description:** The distance in meters between the first place and you.
**Example:** `distance_diff_top>=7`
**Meaning:** There's at least 7 meters difference between the character currently in the first place and you.
**Note:** This condition only uses whole numbers. See distance_diff_top_float for the same condition with floating point numbers.
**Implemented in:** `conditions/distance.ts` (noop placeholder)

#### `distance_diff_top_float` ⚠️

**Description:** The distance in decimeters between the first place and you.
**Example:** `distance_diff_top_float<=25`
**Meaning:** There's at most a 2.5 meters difference between the character currently in the first place and you.
**Note:** Divide the number by 10 to get the difference in meters. A value of 25 means a difference of 2.5 meters.
**Implemented in:** `conditions/distance.ts` (noop placeholder)

---

### Spatial Proximity

#### `behind_near_lane_time` ⚠️

**Description:** The number of seconds there's another uma right behind you.
**Example:** `behind_near_lane_time>=3`
**Meaning:** Another uma has been right behind you for at least 3 seconds.
**Note:** "Right behind" means no more than 2.5 meters behind, and no more than 1 lane (1/18 of the track's width) to either side.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `behind_near_lane_time_set1` ⚠️

**Description:** The number of seconds there's another uma behind you.
**Example:** `behind_near_lane_time_set1>=1`
**Meaning:** Another uma has been behind you for at least 1 seconds.
**Note:** Similar to behind_near_lane_time with different values. "Behind" here means no more than 5 meters behind, and no more than 2.7 lanes.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `infront_near_lane_time` ⚠️

**Description:** The number of seconds there's another uma right in front of you.
**Example:** `infront_near_lane_time>=3`
**Meaning:** Another uma has been right in front of you for at least 3 seconds.
**Note:** "Right in front" means no more than 2.5 meters ahead, and no more than 1 lane (1/18 of the track's width) to either side.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `is_behind_in` ⚠️

**Description:** Checks if the girl behind you is closer to the inner fence than you.
**Example:** `is_behind_in==1`
**Meaning:** The uma behind you is closer to the inner fence than you.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `near_count` ⚠️

**Description:** The number of other girls that are currently near you.
**Example:** `near_count==4`
**Meaning:** There are exactly four other girls near you.
**Note:** "Near" means no further than 3 meters behind/ahead, and no further than 3 lanes to either side. 1 lane equals to 1/18 of the track's width.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `near_infront_count` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `visiblehorse` ⚠️

**Description:** The number of girls in your field of vision.
**Example:** `visiblehorse>=4`
**Meaning:** There are at least 4 girls in your field of vision.
**Implemented in:** `conditions/misc.ts` (noop placeholder)

---

### Blocking

#### `blocked_all_continuetime` ⚠️

**Description:** The number of seconds you've been blocked from the front and at least one side simultaneously.
**Example:** `blocked_all_continuetime>=1`
**Meaning:** You've been blocked by other umas both in front and on the side for at least one second.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `blocked_front` ⚠️

**Description:** Checks if you're currently being blocked by someone in front of you.
**Example:** `blocked_front==1`
**Meaning:** Someone is right in front of you.
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `blocked_front_continuetime` ⚠️

**Description:** The number of seconds you've been blocked from the front.
**Example:** `blocked_front_continuetime>=1`
**Meaning:** You've been blocked by another uma in front of you for at least a second.
**Implemented in:** `conditions/spatial.ts` (erlang random)

#### `blocked_side_continuetime` ⚠️

**Description:** The number of seconds you've been blocked from at least one side.
**Example:** `blocked_side_continuetime>=2`
**Meaning:** You've been blocked by another uma from either side for at least 2 seconds.
**Implemented in:** `conditions/spatial.ts` (erlang random)

#### `is_surrounded` ⚠️

**Description:** Checks if you're currently surrounded.
**Example:** `is_surrounded==1`
**Meaning:** You're currently surrounded by other girls.
**Note:** You're being surrounded if there are other uma musume in front, behind, and next to you (with specific distance/lane requirements).
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

---

### Phase

#### `phase` ✅

**Description:** Current phase of the race.
**Example:** `phase>=2`
**Meaning:** You're currently either in the Late-Race or the Last Spurt.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_corner_random` ✅

**Description:** Picks a random point during a corner on the selected phase.
**Example:** `phase_corner_random==1`
**Meaning:** A random point during a corner in the Mid-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_first_half_straight_random` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `phase_firsthalf` ✅

**Description:** Checks if you're in the first half of the selected phase.
**Example:** `phase_firsthalf==1`
**Meaning:** You're in the first half of the Mid-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_firsthalf_random` ✅

**Description:** Picks a random point during the first half of the selected phase.
**Example:** `phase_firsthalf_random==1`
**Meaning:** A random point on the first half of the Mid-Race is selected.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_firstquarter` ✅

**Description:** Checks if you're in the first quarter of the selected phase.
**Example:** `phase_firstquarter==1`
**Meaning:** You're in the first quarter of the Mid-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_firstquarter_random` ✅

**Description:** Picks a random point during the first quarter of the selected phase.
**Example:** `phase_firstquarter_random==1`
**Meaning:** A random point on the first quarter of the Mid-Race is selected.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_laterhalf` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `phase_laterhalf_random` ✅

**Description:** Picks a random point during the second half of the selected phase.
**Example:** `phase_laterhalf_random==0`
**Meaning:** A random point in the second half of the Early-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_latter_half_straight_random` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `phase_random` ✅

**Description:** Picks a random point during the selected phase.
**Example:** `phase_random==0`
**Meaning:** A random point in the Early-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

#### `phase_straight_random` ✅

**Description:** Picks a random point during a straight in the selected phase.
**Example:** `phase_straight_random==1`
**Meaning:** A random point during a straight in the Mid-Race.
**Values:** 0 (Early-Race), 1 (Mid-Race), 2 (Late-Race), 3 (Last Spurt)
**Implemented in:** `conditions/phase.ts`

---

### Last Spurt

#### `is_lastspurt` ✅

**Description:** Checks if you're currently in the last spurt.
**Example:** `is_lastspurt==1`
**Meaning:** You're in the last spurt mode.
**Note:** This refers to the last spurt mode of the character (when they have enough stamina to finish at max speed), not the Last Spurt phase.
**Implemented in:** `conditions/phase.ts`

#### `lastspurt` ✅

**Description:** Checks if you can carry out your last spurt.
**Example:** `lastspurt==2`
**Meaning:** You have more than enough stamina (HP) left to carry out your last spurt at full strength.
**Values:** 0 (not enough stamina to finish at base speed), 1 (enough to run above base speed but not max), 2 (enough to finish at max speed)
**Implemented in:** `conditions/phase.ts`

---

### Course Features

#### `corner` ✅

**Description:** Checks if you're currently on a corner (and if yes, then which one).
**Example:** `corner!=0`
**Meaning:** You're currently on any corner.
**Values:** 0 (not a corner), 1 (first corner), 2 (second corner), 3 (third corner), 4 (fourth corner)
**Implemented in:** `conditions/corner.ts`

#### `corner_count` ✅

**Description:** The number of corners in the race.
**Implemented in:** `conditions/corner.ts`

#### `corner_random` ✅

**Description:** Picks a random point during the selected corner.
**Example:** `corner_random==1`
**Meaning:** A random point on the first corner is selected.
**Note:** If the race goes through the same corner multiple times, it will always activate at the last possible opportunity.
**Values:** 1 (first corner), 2 (second corner), 3 (third corner), 4 (fourth corner)
**Implemented in:** `conditions/corner.ts`

#### `all_corner_random` ✅

**Description:** Picks a random point during any corner.
**Example:** `all_corner_random==1`
**Meaning:** A random point on a random corner is selected.
**Note:** This condition randomly picks four points (each time rolls a random corner, and then a random point on that corner).
**Implemented in:** `conditions/corner.ts`

#### `is_finalcorner` ✅

**Description:** Checks if you're currently on the final corner or beyond.
**Example:** `is_finalcorner==1`
**Meaning:** You're currently on the last corner or beyond it.
**Note:** "Beyond" means that this can activate on the final straight if there's one after the final corner.
**Implemented in:** `conditions/corner.ts`

#### `is_finalcorner_laterhalf` ✅

**Description:** Checks if you're currently on the second half of the final corner.
**Example:** `is_finalcorner_laterhalf==1`
**Meaning:** You're on the second half of the final corner.
**Implemented in:** `conditions/corner.ts`

#### `is_finalcorner_random` ✅

**Description:** Picks a random point on the final corner.
**Example:** `is_finalcorner_random==1`
**Meaning:** A random point on the final corner.
**Note:** Unlike is_finalcorner, this condition refers to the actual last corner only (can't pick a point on the last straight).
**Implemented in:** `conditions/corner.ts`

---

### Straights

#### `straight_front_type` ✅

**Description:** Checks if you're currently on a specific straight.
**Example:** `straight_front_type==2`
**Meaning:** You're currently on a straight on the opposite side of the racecourse from where the audience is.
**Values:** 1 (straight in front of the audience), 2 (straight on the opposite side from the audience)
**Implemented in:** `conditions/straight.ts`

#### `straight_random` ✅

**Description:** Picks a random point on any straight.
**Example:** `straight_random==1`
**Meaning:** A random point on any straight is selected.
**Note:** First rolls for a straight segment, and then for a random point on that segment.
**Implemented in:** `conditions/straight.ts`

#### `is_last_straight` ✅

**Description:** Checks if you're currently on the final straight of the course.
**Example:** `is_last_straight==1`
**Meaning:** You're currently on the final straight of the course.
**Note:** If a course only has one straight, the first straight is the last straight.
**Implemented in:** `conditions/straight.ts`

#### `is_last_straight_onetime` ✅

**Description:** Checks if you've just entered the last straight.
**Example:** `is_last_straight_onetime==1`
**Meaning:** You have just arrived at the last straight.
**Implemented in:** `conditions/straight.ts`

#### `last_straight_random` ✅

**Description:** Picks a random point on the last straight.
**Example:** `last_straight_random==1`
**Meaning:** A random point on the last straight is selected.
**Implemented in:** `conditions/straight.ts`

---

### Slopes

#### `slope` ✅

**Description:** Checks if you're currently running uphill or downhill.
**Example:** `slope==1`
**Meaning:** You're currently running uphill.
**Values:** 0 (no slope), 1 (up), 2 (down)
**Implemented in:** `conditions/slope.ts`

#### `up_slope_random` ✅

**Description:** Picks a random point on any uphill.
**Example:** `up_slope_random==1`
**Meaning:** A random point on any uphill part of the race is selected.
**Implemented in:** `conditions/slope.ts`

#### `up_slope_random_later_half` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `down_slope_random` ✅

**Description:** Picks a random point on any downhill.
**Example:** `down_slope_random==1`
**Meaning:** A random point on any downhill part of the race is selected.
**Implemented in:** `conditions/slope.ts`

---

### Lane & Movement

#### `is_move_lane` ⚠️

**Description:** Checks if you've just moved left or right.
**Example:** `is_move_lane==1`
**Meaning:** You've just moved closer to the inner fence.
**Values:** 1 (moved closer to the fence), 2 (moved further from the fence)
**Implemented in:** `conditions/spatial.ts` (noop placeholder)

#### `lane_type` ⚠️

**Description:** The lane you're currently running in.
**Example:** `lane_type==0`
**Meaning:** You're currently running right next to the inner fence.
**Values:** inner <= 0.2 < middle <= 0.4 outer <= 0.6 < outside
**Implemented in:** `conditions/misc.ts` (noop placeholder)

---

### Course Information

#### `course_distance` ✅

**Description:** The length of the current race.
**Example:** `course_distance==2400`
**Meaning:** The current race is exactly 2400 meters long.
**Implemented in:** `conditions/distance.ts`

#### `distance_type` ✅

**Description:** The distance type of the current race.
**Example:** `distance_type==4`
**Meaning:** The current race is long.
**Values:** 1 (sprint), 2 (mile), 3 (medium), 4 (long)
**Implemented in:** `conditions/course.ts`

#### `furlong` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `ground_condition` ✅

**Description:** The current condition of the track.
**Example:** `ground_condition==1`
**Meaning:** The track is in good condition.
**Values:** 1 (good), 2 (slightly heavy), 3 (heavy), 4 (bad)
**Implemented in:** `conditions/course.ts`

#### `ground_type` ✅

**Description:** The ground type of the current race.
**Example:** `ground_type==2`
**Meaning:** The race is taking place on a dirt track.
**Values:** 1 (turf), 2 (dirt)
**Implemented in:** `conditions/course.ts`

#### `is_basis_distance` ✅

**Description:** The distance type of the track.
**Example:** `is_basis_distance==1`
**Meaning:** The total distance of the race is divisible by 400 (e.g. 1600, 2000, 2400).
**Note:** "Core" distance is divisible by 400, "non-core" distance isn't.
**Values:** 0 (non-core), 1 (core)
**Implemented in:** `conditions/course.ts`

#### `is_dirtgrade` ✅

**Description:** The race is an exchange race (takes place at Kawasaki, Funabashi, Morioka, or Ooi).
**Example:** `is_dirtgrade==1`
**Meaning:** The current race is an exchange race.
**Note:** More generally, any race held on a racetrack which is considered to be a 「地方」 (local) racetrack.
**Values:** 0 (False), 1 (True)
**Implemented in:** `conditions/course.ts`

#### `rotation` ✅

**Description:** The direction of the race.
**Example:** `rotation==1`
**Meaning:** The current race is run clockwise.
**Values:** 1 (clockwise/right), 2 (counterclockwise/left)
**Implemented in:** `conditions/course.ts`

#### `track_id` ✅

**Description:** The ID of the current racetrack.
**Example:** `track_id==10006`
**Meaning:** The race is taking place on the Tokyo racetrack.
**Values:** 10001 (Sapporo), 10002 (Hakodate), 10003 (Niigata), 10004 (Fukushima), 10005 (Nakayama), 10006 (Tokyo), 10007 (Chukyo), 10008 (Kyoto), 10009 (Hanshin), 10010 (Kokura), 10101 (Ooi), 10103 (Kawasaki), 10104 (Funabashi), 10105 (Morioka)
**Implemented in:** `conditions/course.ts`

---

### Race Parameters

#### `grade` ✅

**Description:** The grade of the current race.
**Example:** `grade==100`
**Meaning:** The current race is of grade G1.
**Note:** All the "big" races without a specified grade (URA Finals, Champions Meeting, Team Trials, etc.) generally fall into the 100 (G1) category.
**Values:** 100 (G1), 200 (G2), 300 (G3), 400 (OP), 700 (Pre-OP), 800 (maiden), 900 (debut), 999 (daily)
**Implemented in:** `conditions/race-params.ts`

#### `motivation` ✅

**Description:** Your Mood going into the race.
**Example:** `motivation>=4`
**Meaning:** Your motivation is Good or better.
**Values:** 1 (Terrible | 絶不調), 2 (Bad | 不調), 3 (Normal | 普通), 4 (Good | 好調), 5 (Perfect | 絶好調)
**Implemented in:** `conditions/race-params.ts`

#### `popularity` ⚠️

**Description:** Your popularity rank among the girls in the current race.
**Example:** `popularity==1`
**Meaning:** You're the most popular girl in the race.
**Implemented in:** `conditions/race-params.ts` (noop placeholder)

#### `season` ✅

**Description:** The current season.
**Example:** `season==1@season==5`
**Meaning:** It's currently spring (either early spring or the cherry blossom season).
**Note:** The "Cherry blossom" season refers to late spring. Skills that activate in spring generally have "1 or 5" in their season conditions.
**Values:** 1 (spring), 2 (summer), 3 (fall), 4 (winter), 5 (cherry blossom)
**Implemented in:** `conditions/race-params.ts`

#### `time` ✅

**Description:** The time of day during which the race takes place.
**Example:** `time==4`
**Meaning:** It's currently night.
**Note:** This refers to the icon displayed alongside race details.
**Values:** 0 (Any), 1 (Morning), 2 (Daytime), 3 (Evening), 4 (Night)
**Implemented in:** `conditions/race-params.ts`

#### `weather` ✅

**Description:** The current weather.
**Example:** `weather==4`
**Meaning:** It's snowing.
**Values:** 1 (sunny), 2 (cloudy), 3 (rainy), 4 (snowy)
**Implemented in:** `conditions/race-params.ts`

---

### Stats

#### `base_guts` ✅

**Description:** Your guts stat.
**Example:** `base_guts>=1200`
**Meaning:** Your guts stat is 1200 or higher.
**Implemented in:** `conditions/stats.ts`

#### `base_power` ✅

**Description:** Your power stat.
**Example:** `base_power>=1200`
**Meaning:** Your power stat is 1200 or higher.
**Implemented in:** `conditions/stats.ts`

#### `base_speed` ✅

**Description:** Your speed stat.
**Example:** `base_speed>=1200`
**Meaning:** Your speed stat is 1200 or higher.
**Implemented in:** `conditions/stats.ts`

#### `base_stamina` ✅

**Description:** Your stamina stat.
**Example:** `base_stamina>=1200`
**Meaning:** Your Stamina stat is 1200 or higher.
**Implemented in:** `conditions/stats.ts`

#### `base_wiz` ✅

**Description:** Your wisdom stat.
**Example:** `base_wiz>=1200`
**Meaning:** Your wisdom stat is 1200 or higher.
**Implemented in:** `conditions/stats.ts`

---

### Strategy

#### `running_style` ✅

**Description:** Your running strategy.
**Example:** `running_style==1`
**Meaning:** You're a runner (Front Runner).
**Values:** 1 (Front Runner), 2 (Pace Chaser), 3 (Late Surger), 4 (End Closer)
**Implemented in:** `conditions/strategy.ts`

#### `running_style_count_nige_otherself` ⚠️

**Description:** The numbers of Front Runners in the race.
**Example:** `running_style_count_nige_otherself>=1`
**Meaning:** At least one of the other girls in the race is a Front Runner.
**Note:** You're not included in this number.
**Implemented in:** `conditions/strategy.ts` (valueFilter placeholder)

#### `running_style_count_oikomi_otherself` ⚠️

**Description:** The numbers of End Closers in the race.
**Example:** `running_style_count_oikomi_otherself>=1`
**Meaning:** At least one of the other girls in the race is an End Closer.
**Note:** You're not included in this number.
**Implemented in:** `conditions/strategy.ts` (valueFilter placeholder)

#### `running_style_count_same` ⚠️

**Description:** The number of characters with the same running strategy as you.
**Example:** `running_style_count_same<=1`
**Meaning:** Nobody shares the same strategy with you (if you're a Front Runner, you're the only Front Runner).
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_count_same_rate` ⚠️

**Description:** The percentage of characters with the same running strategy as you.
**Example:** `running_style_count_same_rate>=40`
**Meaning:** At least 40% of the girls in the current race have the same strategy as you (e.g. Front Runner).
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_count_sashi_otherself` ⚠️

**Description:** The numbers of Late Surgers in the race.
**Example:** `running_style_count_sashi_otherself>=1`
**Meaning:** At least one of the other girls in the race is a Late Surger.
**Note:** You're not included in this number.
**Implemented in:** `conditions/strategy.ts` (valueFilter placeholder)

#### `running_style_count_senko_otherself` ⚠️

**Description:** The numbers of Pace Chasers in the race.
**Example:** `running_style_count_senko_otherself>=1`
**Meaning:** At least one of the other girls in the race is a Pace Chaser.
**Note:** You're not included in this number.
**Implemented in:** `conditions/strategy.ts` (valueFilter placeholder)

#### `running_style_equal_popularity_one` ⚠️

**Description:** Checks if your running strategy is the same as the strategy of the most popular girl in the race.
**Example:** `running_style_equal_popularity_one==1`
**Meaning:** You share the same running strategy with the #1 popular girl in the race.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_temptation_count_nige` ⚠️

**Description:** The number of Front Runners that are currently rushing (kakari).
**Example:** `running_style_temptation_count_nige>=1`
**Meaning:** There's at least one currently rushing Front Runner in the race.
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_temptation_count_oikomi` ⚠️

**Description:** The number of End Closers that are currently rushing (kakari).
**Example:** `running_style_temptation_count_oikomi>=1`
**Meaning:** There's at least one currently rushing End Closer in the race.
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_temptation_count_sashi` ⚠️

**Description:** The number of Late Surgers that are currently rushing (kakari).
**Example:** `running_style_temptation_count_sashi>=1`
**Meaning:** There's at least one currently rushing Late Surger in the race.
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_temptation_count_senko` ⚠️

**Description:** The number of Pace Chasers that are currently rushing (kakari).
**Example:** `running_style_temptation_count_senko>=1`
**Meaning:** There's at least one currently rushing Pace Chaser in the race.
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

#### `running_style_temptation_opponent_count_nige` ❌

**Description:** The number of enemy Front Runners that are currently rushing (kakari).
**Example:** `running_style_temptation_opponent_count_nige>=1`
**Meaning:** There's at least one currently rushing enemy Front Runner in the race.
**Not implemented**

#### `running_style_temptation_opponent_count_oikomi` ❌

**Description:** The number of enemy End Closers that are currently rushing (kakari).
**Example:** `running_style_temptation_opponent_count_oikomi>=1`
**Meaning:** There's at least one currently rushing enemy End Closer in the race.
**Not implemented**

#### `running_style_temptation_opponent_count_sashi` ❌

**Description:** The number of enemy Late Surgers that are currently rushing (kakari).
**Example:** `running_style_temptation_opponent_count_sashi>=1`
**Meaning:** There's at least one currently rushing enemy Late Surger in the race.
**Not implemented**

#### `running_style_temptation_opponent_count_senko` ❌

**Description:** The number of enemy Pace Chasers that are currently rushing (kakari).
**Example:** `running_style_temptation_opponent_count_senko>=1`
**Meaning:** There's at least one currently rushing Pace Chaser in the race.
**Not implemented**

---

### Special States

#### `compete_fight_count` ⚠️

**Description:** The number of times you've been in a Showdown.
**Example:** `compete_fight_count>0`
**Meaning:** You participated in at least one Showdown (追い比べ) during the Final Straight.
**Note:** Showdown (追い比べ) refers to the mechanic where directly competing with another girl on the Final Straight gives you extra speed and acceleration based on your guts.
**Implemented in:** `conditions/special-states.ts` (uniform random)

#### `is_badstart` ✅

**Description:** Checks if you've had a late start to the current race.
**Example:** `is_badstart==0`
**Meaning:** You haven't had a late start to the current race.
**Note:** "Late start" refers to starting gate reaction time of over 0.08 seconds.
**Implemented in:** `conditions/special-states.ts`

#### `is_temptation` ⚠️

**Description:** Checks if you're currently rushing (kakari).
**Example:** `is_temptation==0`
**Meaning:** You're currently not rushing.
**Implemented in:** `conditions/special-states.ts` (noop placeholder)

#### `temptation_count` ⚠️

**Description:** The number of times you've been rushing (kakari) during the race.
**Example:** `temptation_count==0`
**Meaning:** You haven't rushing a single time during the race.
**Implemented in:** `conditions/special-states.ts` (noop placeholder)

#### `temptation_count_behind` ⚠️

**Description:** The number of girls behind you that are currently rushing (kakari).
**Example:** `temptation_count_behind>=1`
**Meaning:** At least one uma behind you is rushing.
**Implemented in:** `conditions/special-states.ts` (noop placeholder)

#### `temptation_count_infront` ⚠️

**Description:** The number of girls in front of you that are currently rushing (kakari).
**Example:** `temptation_count_infront>=1`
**Meaning:** At least one uma ahead of you is rushing.
**Implemented in:** `conditions/special-states.ts` (noop placeholder)

#### `temptation_opponent_count_behind` ❌

**Description:** The number of enemies behind you that are currently rushing (kakari).
**Example:** `temptation_opponent_count_behind>=1`
**Meaning:** At least one enemy behind you is rushing.
**Not implemented**

#### `temptation_opponent_count_infront` ❌

**Description:** The number of enemies in front of you that are currently rushing (kakari).
**Example:** `temptation_opponent_count_infront>=1`
**Meaning:** At least one enemy ahead of you is rushing.
**Not implemented**

---

### HP & Stamina

#### `hp_per` ✅

**Description:** Your remaining HP (stamina) in percentage.
**Example:** `hp_per<=70`
**Meaning:** You have at most 70% stamina remaining.
**Implemented in:** `conditions/health.ts`

#### `is_hp_empty_onetime` ✅

**Description:** Checks if your HP (stamina) had been depleted at some point in the race.
**Example:** `is_hp_empty_onetime==1`
**Meaning:** You're out of stamina, or had been previously.
**Implemented in:** `conditions/health.ts`

---

### Random & Gate

#### `always` ⚠️

**Description:** Always activates.
**Example:** `always==1`
**Meaning:** This skill has no particular conditions.
**Implemented in:** `conditions/misc.ts` (noop placeholder)

#### `post_number` ✅

**Description:** The starting gate block you started to race in.
**Example:** `post_number<=3`
**Meaning:** You started the race in starting gate blocks 1, 2, or 3.
**Note:** Gate block is not the same as the gate number. In races with a lot of participants, one block can have several gates.
**Implemented in:** `conditions/gate-random.ts`

#### `random_lot` ✅

**Description:** Rolls a random number from 0-100.
**Example:** `random_lot==50`
**Meaning:** 50% chance for activation.
**Note:** This condition is used as random_lot==number, where number is the chance of winning the roll in percentage.
**Implemented in:** `conditions/gate-random.ts`

---

### Characters & Skills

#### `fan_count` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `is_exist_chara_id` ❌

**Description:** Checks if a character with the given ID is participating in the race.
**Example:** `is_exist_chara_id==1002`
**Meaning:** Silence Suzuka is running in the current race.
**Note:** Only checks for the character, not the version of her.
**Not implemented**

#### `is_exist_skill_id` ❌

**Description:** This condition is probably new. Currently under investigation.
**Not implemented**

#### `is_other_character_activate_advantage_skill` ❌

**Description:** A character other than you has activated an advantageous (i.e. non-debuff) skill of a specific type.
**Example:** `is_other_character_activate_advantage_skill==9`
**Meaning:** Someone has activated a healing skill.
**Not implemented**

#### `same_skill_horse_count` ⚠️

**Description:** The number of girls that have this particular skill.
**Example:** `same_skill_horse_count==1`
**Meaning:** Among all the umas in the race, you're the only one with this particular skill.
**Note:** You count as well.
**Implemented in:** `conditions/strategy.ts` (noop placeholder)

---

## Summary

- **Total Conditions:** 109
- **Fully Implemented:** 72 (66%)
- **Partially Implemented (placeholders):** 26 (24%)
- **Not Implemented:** 11 (10%)

The implementation uses a modular approach with conditions organized by category:

- `activation.ts` - Skill activation counters
- `corner.ts` - Corner-related conditions
- `course.ts` - Course/track properties
- `distance.ts` - Distance and progress conditions
- `gate-random.ts` - Random and gate-related conditions
- `health.ts` - HP/stamina conditions
- `misc.ts` - Miscellaneous conditions
- `order-change.ts` - Position change and overtaking
- `phase.ts` - Race phase conditions
- `position.ts` - Current position conditions
- `race-params.ts` - Race metadata (grade, weather, etc.)
- `slope.ts` - Slope-related conditions
- `spatial.ts` - Spatial proximity and blocking
- `special-states.ts` - Special race states (rushing, dueling, etc.)
- `stats.ts` - Character stat conditions
- `straight.ts` - Straight-related conditions
- `strategy.ts` - Running strategy conditions

Many conditions are marked with "noop" implementations, meaning they're recognized but use placeholder logic. These typically represent complex dynamic conditions that require race simulation state to evaluate properly.
