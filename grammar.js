// Minimal tree-sitter grammar for reco.
//
// Intentionally a *highlighter-only* grammar — it tokenizes the
// source into keywords / identifiers / numbers / strings / comments
// / operators / punctuation, and that's it.  There is no parse tree
// structure (no expressions, no statements, no declarations).
//
// Why so minimal?  reco syntax is still evolving.  A full grammar
// would have to be rewritten every time the language changes shape;
// this one just needs a line added/removed when keywords come and
// go.  When the language stabilises, the smart move is to either
// extend this in place or replace it with a structured grammar.
//
// What you get with this:
//   - Comments, strings, numbers, keywords highlighted
//   - Identifier color (uniform)
//
// What you don't get (until a real grammar lands):
//   - Function-name vs type-name vs variable distinctions
//   - Outline view / fold-by-function
//   - Scope-aware indent rules
//
// Build the wasm output via:
//   cd editor/tree-sitter-reco && tree-sitter generate && tree-sitter build --wasm
// then copy the resulting `tree-sitter-reco.wasm` to
//   editor/zed-reco/grammars/reco.wasm

module.exports = grammar({
  name: 'reco',

  // `word` is the token tree-sitter uses for keyword-vs-identifier
  // disambiguation: it lexes a `word`, then checks whether the text
  // matches a keyword.  Without this, `for` inside an identifier
  // like `for_loop` would be highlighted as the keyword.
  word: $ => $.identifier,

  // Whitespace + comments live "between tokens" — not part of the
  // parse tree, but reachable via highlight queries.
  extras: $ => [/\s+/, $.line_comment, $.block_comment],

  rules: {
    // Top-level: a stream of whatever-tokens.  Tree-sitter requires
    // every grammar to have a start rule; this one accepts anything.
    source_file: $ => repeat(choice(
      $.keyword,
      $.boolean,
      $.number,
      $.string,
      $.char_literal,
      $.operator,
      $.punctuation,
      $.identifier,
    )),

    line_comment:  $ => token(seq('//', /[^\n]*/)),
    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),

    // All current reco keywords.  When the language adds/removes
    // one, just edit this list and rebuild the wasm.
    keyword: $ => choice(
      // Declarations
      'fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'type',
      'distinct', 'use', 'include', 'inline', 'extern', 'pub',
      // Control flow
      'if', 'else', 'for', 'in', 'loop', 'match', 'break', 'continue',
      'return', 'is', 'as',
      // Special
      'self', 'undefined',
    ),

    boolean: $ => choice('true', 'false'),

    // Numbers: decimal (with optional `_` separators), binary, hex.
    number: $ => choice(
      /0b[01_]+/,
      /0x[0-9a-fA-F_]+/,
      /\d[\d_]*/,
    ),

    // Strings: just match double-quoted runs with simple escapes.
    // Tree-sitter regexes don't backtrack — keep it simple.
    string: $ => token(seq(
      '"',
      repeat(choice(/[^"\\]/, /\\./)),
      '"',
    )),

    // Char/byte literals — single-quoted, single char or escape.
    char_literal: $ => token(seq(
      "'",
      choice(/[^'\\]/, /\\./),
      "'",
    )),

    // Identifiers — letters/digits/underscores, can't start with digit.
    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    // Operators.  Order matters for tree-sitter's longest-match
    // tiebreak: list `..=` before `..`, `<=` before `<`, etc.
    operator: $ => choice(
      '..=', '..',
      '<<', '>>', '==', '!=', '<=', '>=',
      '+=', '-=', '*=', '/=', '%=',
      '&&', '||',
      '->', '=>',
      '+', '-', '*', '/', '%',
      '&', '|', '^', '~', '!',
      '<', '>', '=',
    ),

    punctuation: $ => choice(
      '(', ')', '{', '}', '[', ']',
      ',', ';', ':', '@', '.', '?',
    ),
  },
});
