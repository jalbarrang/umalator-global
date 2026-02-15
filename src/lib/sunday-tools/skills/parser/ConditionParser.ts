import { defaultConditions } from './conditions/conditions';
import { defaultOperators } from './conditions/operators';
import type {
  ConditionsMap,
  ICondition,
  Operator,
  OperatorsConfig,
  ParseNode,
  Parser,
} from './definitions';

class ParseError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

const isNumber = (character: number) => {
  return '0'.charCodeAt(0) <= character && character <= '9'.charCodeAt(0);
};

const isIdentifier = (character: number) => {
  return (
    ('a'.charCodeAt(0) <= character && character <= 'z'.charCodeAt(0)) ||
    ('0'.charCodeAt(0) <= character && character <= '9'.charCodeAt(0)) ||
    character == '_'.charCodeAt(0)
  );
};

interface Token<TCondition, TOperator> {
  lbp: number;
  led: (
    state: ParserState<TCondition, TOperator>,
    left: ParseNode<TCondition, TOperator>,
  ) => ParseNode<TCondition, TOperator>;
  nud: (state: ParserState<TCondition, TOperator>) => ParseNode<TCondition, TOperator>;
}

type ParserState<TCondition, TOperator> = {
  current: Token<TCondition, TOperator>;
  next: Token<TCondition, TOperator>;
  tokens: Iterator<Token<TCondition, TOperator>>;
};

class IntValue<TCondition, TOperator> implements Token<TCondition, TOperator> {
  lbp = 0;
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  led(
    _state: ParserState<TCondition, TOperator>,
    _left: ParseNode<TCondition, TOperator>,
  ): ParseNode<TCondition, TOperator> {
    throw new ParseError('unexpected integer literal');
  }

  nud(_state: ParserState<TCondition, TOperator>) {
    return { type: 'int', value: this.value } as ParseNode<TCondition, TOperator>;
  }
}

// ============================================================
// Parser factory
// ============================================================

export type CreateParserOptions<TCondition, TOperator> = {
  conditions?: ConditionsMap<TCondition>;
  operators?: OperatorsConfig<TCondition, TOperator>;
};

// Implementation
function generateParser<TCondition = ICondition, TOperator = Operator>(
  conditions: ConditionsMap<TCondition>,
  operators: OperatorsConfig<TCondition, TOperator>,
): Parser<TCondition, TOperator> {
  const endOfFile: Token<TCondition, TOperator> = {
    lbp: 0,
    led: () => {
      throw new ParseError('unexpected eof');
    },
    nud: () => {
      throw new ParseError('unexpected eof');
    },
  };

  class Identifier implements Token<TCondition, TOperator> {
    lbp = 0;

    constructor(readonly value: string) {}

    led(): ParseNode<TCondition, TOperator> {
      throw new ParseError('unexpected identifier');
    }

    nud(): ParseNode<TCondition, TOperator> {
      return { type: 'cond', cond: conditions[this.value] };
    }
  }

  class CmpOp implements Token<TCondition, TOperator> {
    constructor(
      readonly lbp: number,
      readonly opclass: new (cond: TCondition, arg: number) => TOperator,
    ) {}

    led(
      state: ParserState<TCondition, TOperator>,
      left: ParseNode<TCondition, TOperator>,
    ): ParseNode<TCondition, TOperator> {
      if (left.type !== 'cond')
        throw new ParseError('expected condition on left hand side of comparison');
      const right = expression(state, this.lbp);
      if (right.type !== 'int')
        throw new ParseError('expected number on right hand side of comparison');
      return { type: 'op', op: new this.opclass(left.cond, right.value) };
    }

    nud(): ParseNode<TCondition, TOperator> {
      throw new ParseError('expected expression');
    }
  }

  class LogicalOp implements Token<TCondition, TOperator> {
    constructor(
      readonly lbp: number,
      readonly opclass: new (left: TOperator, right: TOperator) => TOperator,
    ) {}

    led(
      state: ParserState<TCondition, TOperator>,
      left: ParseNode<TCondition, TOperator>,
    ): ParseNode<TCondition, TOperator> {
      if (left.type !== 'op')
        throw new ParseError('expected comparison on left hand side of operator');
      const right = expression(state, this.lbp);
      if (right.type !== 'op')
        throw new ParseError('expected comparison on right hand side of operator');
      return { type: 'op', op: new this.opclass(left.op, right.op) };
    }

    nud(): ParseNode<TCondition, TOperator> {
      throw new ParseError('expected expression');
    }
  }

  const OperatorEq = new CmpOp(30, operators.eq);
  const OperatorNeq = new CmpOp(30, operators.neq);
  const OperatorLt = new CmpOp(30, operators.lt);
  const OperatorLte = new CmpOp(30, operators.lte);
  const OperatorGt = new CmpOp(30, operators.gt);
  const OperatorGte = new CmpOp(30, operators.gte);
  const OperatorAnd = new LogicalOp(20, operators.and);
  const OperatorOr = new LogicalOp(10, operators.or);

  function* tokenize(
    conditionString: string,
  ): Generator<Token<TCondition, TOperator>, Token<TCondition, TOperator>> {
    let i = 0;

    while (i < conditionString.length) {
      let characterCode = conditionString.charCodeAt(i);

      if (isNumber(characterCode)) {
        let digit = 0;
        while (isNumber(characterCode)) {
          digit = digit * 10 + (characterCode - 48);
          characterCode = conditionString.charCodeAt(++i);
        }
        yield new IntValue<TCondition, TOperator>(digit);
      } else if (isIdentifier(characterCode)) {
        const identifierStart = i;
        while (isIdentifier(characterCode)) {
          characterCode = conditionString.charCodeAt(++i);
        }
        yield new Identifier(conditionString.slice(identifierStart, i));
      } else {
        switch (conditionString[i]) {
          case '=':
            if (conditionString[++i] !== '=') throw new ParseError('expected =');
            ++i;
            yield OperatorEq;
            break;
          case '!':
            if (conditionString[++i] !== '=') throw new ParseError('expected =');
            ++i;
            yield OperatorNeq;
            break;
          case '<':
            if (conditionString[++i] === '=') {
              ++i;
              yield OperatorLte;
            } else {
              yield OperatorLt;
            }
            break;
          case '>':
            if (conditionString[++i] === '=') {
              ++i;
              yield OperatorGte;
            } else {
              yield OperatorGt;
            }
            break;
          case '@':
            yield OperatorOr;
            ++i;
            break;
          case '&':
            yield OperatorAnd;
            ++i;
            break;
          default:
            throw new ParseError('invalid character');
        }
      }
    }

    return endOfFile;
  }

  // top-down operator precedence parser (Pratt parser)
  // the grammar of the condition "language" is quite simple:
  //     Or ::= And '@' Or | And
  //     And ::= Cmp '&' And | Cmp
  //     Cmp ::= condition Op integer
  //     Op ::= '==' | '!=' | '>' | '>=' | '<' | '<='
  // there are no parenthesis nor any other way to control precedence

  function expression(
    state: ParserState<TCondition, TOperator>,
    rbp: number,
  ): ParseNode<TCondition, TOperator> {
    state.current = state.next;
    state.next = state.tokens.next().value;
    let left = state.current.nud(state);
    while (rbp < state.next.lbp) {
      state.current = state.next;
      state.next = state.tokens.next().value;
      left = state.current.led(state, left);
    }
    return left;
  }

  function internalParseAny(
    tokens: Iterator<Token<TCondition, TOperator>, Token<TCondition, TOperator>>,
  ): ParseNode<TCondition, TOperator> {
    const state = { current: endOfFile, next: tokens.next().value, tokens };
    return expression(state, 0);
  }

  // Public API - string-based
  return {
    parse(conditionString: string): TOperator {
      const node = internalParseAny(tokenize(conditionString));
      if (node.type !== 'op') {
        throw new ParseError('expected comparison or operator');
      }
      return node.op;
    },

    parseAny(conditionString: string): ParseNode<TCondition, TOperator> {
      return internalParseAny(tokenize(conditionString));
    },
  };
}

export const createParser = (options: CreateParserOptions<ICondition, Operator> = {}) => {
  const { conditions = defaultConditions, operators = defaultOperators } = options;

  return generateParser(conditions, operators);
};

// Public: Typed parser for custom use cases (formatters, etc.)
export const createTypedParser = <TCondition, TOperator>(
  conditions: ConditionsMap<TCondition>,
  operators: OperatorsConfig<TCondition, TOperator>,
): Parser<TCondition, TOperator> => {
  return generateParser(conditions, operators);
};
