import { orderFilter, orderInFilter, orderOutFilter } from "../helpers";

export const PositionConditions = {
  order: orderFilter((pos: number, _: number) => pos),
  order_rate: orderFilter((rate: number, numUmas: number) =>
    Math.round(numUmas * (rate / 100.0)),
  ),
  order_rate_in20_continue: orderInFilter(0.2),
  order_rate_in40_continue: orderInFilter(0.4),
  order_rate_in50_continue: orderInFilter(0.5),
  order_rate_in80_continue: orderInFilter(0.8),
  order_rate_out20_continue: orderOutFilter(0.2),
  order_rate_out40_continue: orderOutFilter(0.4),
  order_rate_out50_continue: orderOutFilter(0.5),
  order_rate_out70_continue: orderOutFilter(0.7),
}
