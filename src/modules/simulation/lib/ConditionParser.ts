import {
  AndOperator,
  Conditions,
  EqOperator,
  GtOperator,
  GteOperator,
  LtOperator,
  LteOperator,
  NeqOperator,
  OrOperator,
} from './ActivationConditions';
import type { Condition, Operator } from './ActivationConditions';

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
    left: Node<TCondition, TOperator>,
  ) => Node<TCondition, TOperator>;
  nud: (state: ParserState<TCondition, TOperator>) => Node<TCondition, TOperator>;
}

export const enum NodeType {
  Int,
  Cond,
  Op,
}
export type Node<TCondition = Condition, TOperator = Operator> =
  | { type: NodeType.Int; value: number }
  | { type: NodeType.Cond; cond: TCondition }
  | { type: NodeType.Op; op: TOperator };

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
    _left: Node<TCondition, TOperator>,
  ): Node<TCondition, TOperator> {
    throw new ParseError('unexpected integer literal');
  }

  nud(_state: ParserState<TCondition, TOperator>) {
    return { type: NodeType.Int, value: this.value } as Node<TCondition, TOperator>;
  }
}

export function getParser<TCondition = Condition, TOperator = Operator>(
  conditions: { [cond: string]: TCondition } = Conditions as unknown as {
    [cond: string]: TCondition;
  }, // as far as i can tell there's really no easy way to get this to work
  operators: {
    and: new (left: TOperator, right: TOperator) => TOperator;
    or: new (left: TOperator, right: TOperator) => TOperator;
    eq: new (cond: TCondition, arg: number) => TOperator;
    neq: new (cond: TCondition, arg: number) => TOperator;
    lt: new (cond: TCondition, arg: number) => TOperator;
    lte: new (cond: TCondition, arg: number) => TOperator;
    gt: new (cond: TCondition, arg: number) => TOperator;
    gte: new (cond: TCondition, arg: number) => TOperator;
  } = {
    and: AndOperator as unknown as new (left: TOperator, right: TOperator) => TOperator, // this is really stupid
    or: OrOperator as unknown as new (left: TOperator, right: TOperator) => TOperator,
    eq: EqOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
    neq: NeqOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
    lt: LtOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
    lte: LteOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
    gt: GtOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
    gte: GteOperator as unknown as new (cond: TCondition, arg: number) => TOperator,
  },
) {
  const endOfFile = {
    lbp: 0,
    led: (
      _state: ParserState<TCondition, TOperator>,
      _left: Node<TCondition, TOperator>,
    ): Node<TCondition, TOperator> => {
      throw new ParseError('unexpected eof');
    },
    nud: (_state: ParserState<TCondition, TOperator>): Node<TCondition, TOperator> => {
      throw new ParseError('unexpected eof');
    },
  };

  class Identifier implements Token<TCondition, TOperator> {
    lbp = 0;
    value: string;

    constructor(value: string) {
      this.value = value;
    }

    led(
      _state: ParserState<TCondition, TOperator>,
      _left: Node<TCondition, TOperator>,
    ): Node<TCondition, TOperator> {
      throw new ParseError('unexpected identifier');
    }

    nud(_state: ParserState<TCondition, TOperator>) {
      return {
        type: NodeType.Cond,
        cond: conditions[this.value as keyof typeof conditions],
      } as Node<TCondition, TOperator>;
    }
  }

  class CmpOp {
    constructor(
      readonly lbp: number,
      readonly opclass: new (cond: TCondition, arg: number) => TOperator,
    ) {}

    led(state: ParserState<TCondition, TOperator>, left: Node<TCondition, TOperator>) {
      if (left.type != NodeType.Cond)
        throw new ParseError('expected condition on left hand side of comparison');
      const right = expression(state, this.lbp);
      if (right.type != NodeType.Int)
        throw new ParseError('expected number on right hand side of comparison');
      return {
        type: NodeType.Op,
        op: new this.opclass(left.cond, right.value),
      } as Node<TCondition, TOperator>;
    }

    nud(_state: ParserState<TCondition, TOperator>): Node<TCondition, TOperator> {
      throw new ParseError('expected expression');
    }
  }

  class LogicalOp {
    constructor(
      readonly lbp: number,
      readonly opclass: new (left: TOperator, right: TOperator) => TOperator,
    ) {}

    led(state: ParserState<TCondition, TOperator>, left: Node<TCondition, TOperator>) {
      if (left.type != NodeType.Op)
        throw new ParseError('expected comparison on left hand side of operator');
      const right = expression(state, this.lbp);
      if (right.type != NodeType.Op)
        throw new ParseError('expected comparison on right hand side of operator');
      return {
        type: NodeType.Op,
        op: new this.opclass(left.op, right.op),
      } as Node<TCondition, TOperator>;
    }

    nud(_state: ParserState<TCondition, TOperator>): Node<TCondition, TOperator> {
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

  function* tokenize(conditionString: string) {
    let i = 0;

    while (i < conditionString.length) {
      let characterCode = conditionString.charCodeAt(i);

      if (isNumber(characterCode)) {
        let digit = 0;

        while (isNumber(characterCode)) {
          // Convert character to number
          digit *= 10;
          digit += characterCode - '0'.charCodeAt(0);

          // Next character
          characterCode = conditionString.charCodeAt(++i);
        }

        // Yield integer value
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
            if (conditionString[++i] != '=') throw new ParseError('expected =');
            ++i;
            yield OperatorEq;
            break;
          case '!':
            if (conditionString[++i] != '=') throw new ParseError('expected =');
            ++i;
            yield OperatorNeq;
            break;
          case '<':
            if (conditionString[++i] == '=') {
              ++i;
              yield OperatorLte;
            } else {
              yield OperatorLt;
            }
            break;
          case '>':
            if (conditionString[++i] == '=') {
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

  function parseAny(tokens: Iterator<Token<TCondition, TOperator>, Token<TCondition, TOperator>>) {
    const state = {
      current: endOfFile,
      next: tokens.next().value,
      tokens: tokens,
    };

    return expression(state, 0);
  }

  function parse(tokens: Iterator<Token<TCondition, TOperator>, Token<TCondition, TOperator>>) {
    const node = parseAny(tokens);

    if (node.type != NodeType.Op) {
      throw new ParseError('expected comparison or operator');
    }

    return node.op;
  }

  // top-down operator precedence parser (Pratt parser)
  // the grammar of the condition "language" is quite simple:
  //     Or ::= And '@' Or | And
  //     And ::= Cmp '&' And | Cmp
  //     Cmp ::= condition Op integer
  //     Op ::= '==' | '!=' | '>' | '>=' | '<' | '<='
  // there are no parenthesis nor any other way to control precedence

  function expression(state: ParserState<TCondition, TOperator>, rbp: number) {
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

  return { tokenize, parse, parseAny };
}
