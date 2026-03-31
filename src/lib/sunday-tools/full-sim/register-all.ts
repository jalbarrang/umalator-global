import { registerBlockingConditions } from './blocking-conditions';
import { registerOrderConditions } from './order-conditions';
import { registerProximityConditions } from './proximity-conditions';
import { registerStateConditions } from './state-conditions';

let registered = false;

export function registerAllDynamicConditions(): void {
  if (registered) {
    return;
  }

  registered = true;

  registerOrderConditions();
  registerProximityConditions();
  registerBlockingConditions();
  registerStateConditions();
}
