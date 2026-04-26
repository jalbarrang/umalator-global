# Compile exclusive branches as prioritized opportunity sets

The `@` condition operator compiles to an **Exclusive Opportunity Set** with left-to-right branch priority, not to a unioned region list plus a combined predicate. We chose this because the current `OrOperator` comments already identify the union model as broken for branch-local dynamic conditions, and game-like behavior is better represented as “the first eligible branch attempts activation”; a failed activation chance or wit check is still an attempt and does not fall through to lower-priority siblings.
