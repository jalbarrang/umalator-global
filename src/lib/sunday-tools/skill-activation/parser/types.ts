/**
 * Activation Parser Types
 *
 * Types for parsing raw condition strings into a structured AST
 * that the activation compiler can process.
 *
 * The parser is the first stage of the pipeline. It has NO knowledge
 * of course data, runner state, or runtime. It only understands
 * condition grammar: identifiers, comparisons, `&` (AND), `@` (OR/exclusive).
 *
 * The key difference from the legacy parser is that `@` produces
 * explicit exclusive branch nodes rather than being flattened into
 * a lossy union.
 */

// ============================================================
// AST Node Types
// ============================================================

/**
 * A parsed condition expression node.
 *
 * The AST preserves `@` as an explicit exclusive-branch operator
 * rather than the legacy OrOperator union model.
 */
export type ConditionNode =
  | ComparisonNode
  | ConjunctionNode
  | ExclusiveBranchNode;

/**
 * A single condition comparison: `identifier operator value`
 * e.g., `phase==1`, `accumulatetime>=20`, `corner_random==1`
 */
export type ComparisonNode = {
  readonly type: 'comparison';
  readonly conditionName: string;
  readonly comparator: ConditionComparator;
  readonly argument: number;
};

export type ConditionComparator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';

/**
 * AND conjunction of two or more conditions: `left & right`
 * e.g., `phase==1&accumulatetime>=20`
 */
export type ConjunctionNode = {
  readonly type: 'conjunction';
  readonly children: ReadonlyArray<ConditionNode>;
};

/**
 * Exclusive branch operator `@` — produces prioritized branches.
 * e.g., `corner_random==1@corner_random==2` or `phase==0&accumulatetime>=20@phase==1&accumulatetime>=30`
 *
 * The branches are ordered left-to-right with descending priority.
 * This replaces the legacy OrOperator's lossy union.
 */
export type ExclusiveBranchNode = {
  readonly type: 'exclusive_branch';
  readonly branches: ReadonlyArray<ConditionNode>;
};

// ============================================================
// Precondition AST
// ============================================================

/**
 * A parsed precondition expression.
 * Preconditions use the same grammar as conditions but are evaluated
 * at compile time to decide whether an alternative compiles at all.
 */
export type PreconditionNode = ConditionNode;

// ============================================================
// Parse Result
// ============================================================

/**
 * Result of parsing a condition string.
 */
export type ParseResult = {
  readonly node: ConditionNode;
  readonly raw: string;
};

/**
 * Result of parsing a precondition string.
 */
export type PreconditionParseResult = {
  readonly node: PreconditionNode;
  readonly raw: string;
};

// ============================================================
// Condition Registry
// ============================================================

/**
 * Metadata about a known condition primitive.
 * Used by the compiler to derive sampling policies, predicate phases,
 * and diagnostic messages.
 */
export type ConditionPrimitiveInfo = {
  /** The condition name as it appears in condition strings. */
  readonly name: string;
  /** Whether this condition implies a specific sampling policy. */
  readonly impliedSamplingPolicy: import('../compiled/types').SamplingPolicyKind | null;
  /** Whether this condition can be resolved at compile time for a given course/runner. */
  readonly isStaticallyResolvable: boolean;
  /** Whether this condition requires runtime evaluation. */
  readonly requiresRuntimeEvaluation: boolean;
};

// ============================================================
// Parser Interface
// ============================================================

/**
 * The activation parser interface.
 * Parses raw condition/precondition strings into AST nodes.
 */
export type ActivationParser = {
  /** Parse a condition string into an AST node. */
  parseCondition: (conditionString: string) => ParseResult;
  /** Parse a precondition string into an AST node. */
  parsePrecondition: (preconditionString: string) => PreconditionParseResult;
};
