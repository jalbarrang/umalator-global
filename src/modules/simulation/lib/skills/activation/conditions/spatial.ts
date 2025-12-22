import { erlangRandom, noopErlangRandom, noopImmediate, shiftRegionsForwardByMinTime } from "../helpers";

export const SpatialConditions = {
  bashin_diff_behind: noopErlangRandom(3, 2.0),
  bashin_diff_infront: noopErlangRandom(3, 2.0),
  behind_near_lane_time: noopErlangRandom(3, 2.0),
  // NB. at least in theory _set1 should have a slightly more early-biased distribution since it's technically easier to activate, but I don't
  // really think it makes much of a difference. Same with blocked_front vs blocked_front_continuetime I suppose.
  behind_near_lane_time_set1: noopErlangRandom(3, 2.0),
  infront_near_lane_time: noopErlangRandom(3, 2.0),
  blocked_all_continuetime: noopErlangRandom(3, 2.0),
  blocked_front: noopErlangRandom(3, 2.0),
  blocked_front_continuetime: erlangRandom(3, 2.0, {
    filterGte: shiftRegionsForwardByMinTime,
  }),
  blocked_side_continuetime: erlangRandom(3, 2.0, {
    filterGte: shiftRegionsForwardByMinTime,
  }),
  is_surrounded: noopErlangRandom(3, 2.0),
  is_move_lane: noopErlangRandom(5, 1.0),
  near_count: noopErlangRandom(3, 2.0),
  is_behind_in: noopImmediate,
}
