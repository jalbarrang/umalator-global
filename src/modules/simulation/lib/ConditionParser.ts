import {
  Operator,
  EqOperator,
  NeqOperator,
  LtOperator,
  LteOperator,
  GtOperator,
  GteOperator,
  AndOperator,
  OrOperator,
  Condition,
  Conditions,
} from './ActivationConditions';

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

interface Token<T, U> {
  lbp: number;
  led(state: ParserState<T, U>, left: Node<T, U>): Node<T, U>;
  nud(state: ParserState<T, U>): Node<T, U>;
}

export const enum NodeType {
  Int,
  Cond,
  Op,
}
export type Node<ConditionT = Condition, OperatorT = Operator> =
  | { type: NodeType.Int; value: number }
  | { type: NodeType.Cond; cond: ConditionT }
  | { type: NodeType.Op; op: OperatorT };

type ParserState<T, U> = {
  current: Token<T, U>;
  next: Token<T, U>;
  tokens: Iterator<Token<T, U>>;
};

class IntValue<T, U> implements Token<T, U> {
  lbp = 0;
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  led(_state: ParserState<T, U>, _left: Node<T, U>): Node<T, U> {
    throw new ParseError('unexpected integer literal');
  }

  nud(_state: ParserState<T, U>) {
    return { type: NodeType.Int, value: this.value } as Node<T, U>;
  }
}

export function getParser<ConditionT = Condition, OperatorT = Operator>(
  conditions: { [cond: string]: ConditionT } = Conditions as unknown as {
    [cond: string]: ConditionT;
  }, // as far as i can tell there's really no easy way to get this to work
  operators: {
    and: new (left: OperatorT, right: OperatorT) => OperatorT;
    or: new (left: OperatorT, right: OperatorT) => OperatorT;
    eq: new (cond: ConditionT, arg: number) => OperatorT;
    neq: new (cond: ConditionT, arg: number) => OperatorT;
    lt: new (cond: ConditionT, arg: number) => OperatorT;
    lte: new (cond: ConditionT, arg: number) => OperatorT;
    gt: new (cond: ConditionT, arg: number) => OperatorT;
    gte: new (cond: ConditionT, arg: number) => OperatorT;
  } = {
    and: AndOperator as unknown as new (
      left: OperatorT,
      right: OperatorT,
    ) => OperatorT, // this is really stupid
    or: OrOperator as unknown as new (
      left: OperatorT,
      right: OperatorT,
    ) => OperatorT,
    eq: EqOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
    neq: NeqOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
    lt: LtOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
    lte: LteOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
    gt: GtOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
    gte: GteOperator as unknown as new (
      cond: ConditionT,
      arg: number,
    ) => OperatorT,
  },
) {
  const endOfFile = {
    lbp: 0,
    led: (
      _state: ParserState<ConditionT, OperatorT>,
      _left: Node<ConditionT, OperatorT>,
    ): Node<ConditionT, OperatorT> => {
      throw new ParseError('unexpected eof');
    },
    nud: (
      _state: ParserState<ConditionT, OperatorT>,
    ): Node<ConditionT, OperatorT> => {
      throw new ParseError('unexpected eof');
    },
  };

  class Identifier implements Token<ConditionT, OperatorT> {
    lbp = 0;
    value: string;

    constructor(value: string) {
      this.value = value;
    }

    led(
      _state: ParserState<ConditionT, OperatorT>,
      _left: Node<ConditionT, OperatorT>,
    ): Node<ConditionT, OperatorT> {
      throw new ParseError('unexpected identifier');
    }

    nud(_state: ParserState<ConditionT, OperatorT>) {
      return {
        type: NodeType.Cond,
        cond: conditions[this.value as keyof typeof conditions],
      } as Node<ConditionT, OperatorT>;
    }
  }

  class CmpOp {
    constructor(
      readonly lbp: number,
      readonly opclass: new (cond: ConditionT, arg: number) => OperatorT,
    ) {}

    led(
      state: ParserState<ConditionT, OperatorT>,
      left: Node<ConditionT, OperatorT>,
    ) {
      if (left.type != NodeType.Cond)
        throw new ParseError(
          'expected condition on left hand side of comparison',
        );
      const right = expression(state, this.lbp);
      if (right.type != NodeType.Int)
        throw new ParseError(
          'expected number on right hand side of comparison',
        );
      return {
        type: NodeType.Op,
        op: new this.opclass(left.cond, right.value),
      } as Node<ConditionT, OperatorT>;
    }

    nud(
      _state: ParserState<ConditionT, OperatorT>,
    ): Node<ConditionT, OperatorT> {
      throw new ParseError('expected expression');
    }
  }

  class LogicalOp {
    constructor(
      readonly lbp: number,
      readonly opclass: new (left: OperatorT, right: OperatorT) => OperatorT,
    ) {}

    led(
      state: ParserState<ConditionT, OperatorT>,
      left: Node<ConditionT, OperatorT>,
    ) {
      if (left.type != NodeType.Op)
        throw new ParseError(
          'expected comparison on left hand side of operator',
        );
      const right = expression(state, this.lbp);
      if (right.type != NodeType.Op)
        throw new ParseError(
          'expected comparison on right hand side of operator',
        );
      return {
        type: NodeType.Op,
        op: new this.opclass(left.op, right.op),
      } as Node<ConditionT, OperatorT>;
    }

    nud(
      _state: ParserState<ConditionT, OperatorT>,
    ): Node<ConditionT, OperatorT> {
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
        yield new IntValue<ConditionT, OperatorT>(digit);
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

  function parseAny(
    tokens: Iterator<
      Token<ConditionT, OperatorT>,
      Token<ConditionT, OperatorT>
    >,
  ) {
    const state = {
      current: endOfFile,
      next: tokens.next().value,
      tokens: tokens,
    };

    return expression(state, 0);
  }

  function parse(
    tokens: Iterator<
      Token<ConditionT, OperatorT>,
      Token<ConditionT, OperatorT>
    >,
  ) {
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

  function expression(state: ParserState<ConditionT, OperatorT>, rbp: number) {
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
