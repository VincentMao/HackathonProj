/**
 * Tiny, safe evaluator for the rule `condition` grammar used in data/knowledge/rules.json.
 *
 * Supported grammar (recursive descent):
 *   expr    := or
 *   or      := and ("||" and)*
 *   and     := cmp ("&&" cmp)*
 *   cmp     := primary (op primary)?            op ∈ == != >= <= > <
 *            | primary "in" "[" list "]"
 *            | primary "contains" literal
 *   primary := "(" expr ")" | path | literal
 *   literal := 'string' | number | true | false
 *   path    := ident("." ident)*                resolved against the flat context
 *
 * Ordered enums (e.g. neuropathy grades) compare by ORDINALS below so that
 * `neuropathy_severity_reported >= 'grade2'` works and treats grade2 == grade2plus.
 *
 * rules.json is trusted, authored content (never user input); even so we parse rather
 * than eval() so a malformed condition fails loud instead of executing arbitrary code.
 */

/** Ordered-enum ranks for comparison operators. */
const ORDINALS: Record<string, number> = {
  none: 0,
  grade1: 1,
  grade2: 2,
  grade2plus: 2,
};

export type Ctx = Record<string, unknown>;

type Tok = { t: "op" | "punct" | "kw" | "str" | "num" | "bool" | "path"; v: string };

const KEYWORDS = new Set(["in", "contains", "true", "false"]);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const two = ["==", "!=", ">=", "<=", "&&", "||"];
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") j++;
      toks.push({ t: "str", v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    const pair = src.slice(i, i + 2);
    if (two.includes(pair)) {
      toks.push({ t: "op", v: pair });
      i += 2;
      continue;
    }
    if ("()[]".includes(c)) {
      toks.push({ t: "punct", v: c });
      i++;
      continue;
    }
    if (c === "," ) {
      toks.push({ t: "punct", v: "," });
      i++;
      continue;
    }
    if (c === ">" || c === "<") {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: "num", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === "true" || word === "false") toks.push({ t: "bool", v: word });
      else if (KEYWORDS.has(word)) toks.push({ t: "kw", v: word });
      else toks.push({ t: "path", v: word });
      i = j;
      continue;
    }
    throw new Error(`condition: unexpected character '${c}' in "${src}"`);
  }
  return toks;
}

function get(ctx: Ctx, path: string): unknown {
  // Prefer an exact flat key (e.g. "therapy.is_bispecific" alongside scalar "therapy"),
  // then fall back to nested traversal (e.g. "disease.molecular.myc_method").
  if (Object.prototype.hasOwnProperty.call(ctx, path)) return ctx[path];
  return path.split(".").reduce<unknown>((acc, k) => (acc == null ? undefined : (acc as Ctx)[k]), ctx);
}

function ordinal(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v in ORDINALS) return ORDINALS[v];
  return null;
}

/** Evaluate a condition string against a flat/nested context. Returns boolean. */
export function evaluateCondition(condition: string, ctx: Ctx): boolean {
  const toks = tokenize(condition);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  function primary(): unknown {
    const tk = peek();
    if (!tk) throw new Error(`condition: unexpected end in "${condition}"`);
    if (tk.t === "punct" && tk.v === "(") {
      next();
      const val = orExpr();
      const close = next();
      if (!close || close.v !== ")") throw new Error(`condition: expected ) in "${condition}"`);
      return val;
    }
    if (tk.t === "str") return next().v;
    if (tk.t === "num") return Number(next().v);
    if (tk.t === "bool") return next().v === "true";
    if (tk.t === "path") return get(ctx, next().v);
    throw new Error(`condition: unexpected token '${tk.v}' in "${condition}"`);
  }

  function list(): unknown[] {
    const items: unknown[] = [];
    next(); // consume [
    while (peek() && peek().v !== "]") {
      const tk = next();
      if (tk.t === "str") items.push(tk.v);
      else if (tk.t === "num") items.push(Number(tk.v));
      else if (tk.t === "bool") items.push(tk.v === "true");
      else throw new Error(`condition: bad list item '${tk.v}'`);
      if (peek() && peek().v === ",") next();
    }
    next(); // consume ]
    return items;
  }

  function cmp(): boolean | unknown {
    const left = primary();
    const tk = peek();
    if (!tk) return left;
    if (tk.t === "kw" && tk.v === "in") {
      next();
      const arr = list();
      return arr.some((x) => x === left);
    }
    if (tk.t === "kw" && tk.v === "contains") {
      next();
      const lit = primary();
      return Array.isArray(left) && left.includes(lit as never);
    }
    if (tk.t === "op" && ["==", "!=", ">=", "<=", ">", "<"].includes(tk.v)) {
      const op = next().v;
      const right = primary();
      switch (op) {
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        default: {
          const l = ordinal(left);
          const r = ordinal(right);
          if (l == null || r == null) return false;
          if (op === ">=") return l >= r;
          if (op === "<=") return l <= r;
          if (op === ">") return l > r;
          return l < r;
        }
      }
    }
    return left;
  }

  function andExpr(): boolean {
    let v = Boolean(cmp());
    while (peek() && peek().t === "op" && peek().v === "&&") {
      next();
      const rhs = Boolean(cmp());
      v = v && rhs;
    }
    return v;
  }

  function orExpr(): boolean {
    let v = andExpr();
    while (peek() && peek().t === "op" && peek().v === "||") {
      next();
      const rhs = andExpr();
      v = v || rhs;
    }
    return v;
  }

  const result = orExpr();
  if (p !== toks.length) throw new Error(`condition: trailing tokens in "${condition}"`);
  return Boolean(result);
}
