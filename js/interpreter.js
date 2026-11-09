/* C言語サブセットのインタプリタ：字句解析 → 構文解析 → PICマイコンの実行 */
"use strict";
/* =====================================================================
   Tokenizer
   ===================================================================== */
class CErr extends Error { constructor(msg, line){ super(msg); this.line = line; } }

function normalize(src){
  return src
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, " ")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A5/g, "\\")
    .replace(/_\s+_delay_/g, "__delay_");
}

const OPS = ["<<=",">>=","++","--","+=","-=","*=","/=","%=","&=","|=","^=","==","!=","<=",">=","&&","||","<<",">>","->",
  "+","-","*","/","%","&","|","^","~","!","=","<",">","?",":",",",";","(",")","{","}","[","]","."];

function tokenize(src, macros, depth){
  macros = macros || {}; depth = depth || 0;
  const toks = []; let i = 0, line = 1, atStart = true;
  while (i < src.length){
    const c = src[i];
    if (c === "\n"){ line++; i++; atStart = true; continue; }
    if (c === " " || c === "\t" || c === "\r"){ i++; continue; }
    if (c === "/" && src[i+1] === "/"){ while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i+1] === "*"){
      const startLine = line;
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i+1] === "/")){ if (src[i] === "\n") line++; i++; }
      if (i >= src.length) throw new CErr("/* のコメントが閉じていません（*/ を書く）", startLine);
      i += 2; continue;
    }
    if (c === "#" && atStart){
      let j = i; let text = "";
      while (j < src.length && src[j] !== "\n"){
        if (src[j] === "\\" && src[j+1] === "\n"){ j += 2; line++; continue; }
        text += src[j]; j++;
      }
      const m = /^#\s*define\s+([A-Za-z_]\w*)(?!\()\s*(.*)$/.exec(text.trim());
      if (m) macros[m[1]] = m[2].replace(/\/\/.*$/, "").trim();
      i = j; continue;
    }
    atStart = false;
    const rest = src.slice(i, i + 80);
    let m;
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i+1] || ""))){
      m = /^(0[bB][01]+|0[xX][0-9a-fA-F]+|(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+|\d+)([uUlLfF]*)/.exec(rest);
      if (!m) throw new CErr(`数の書き方が正しくありません`, line);
      const s = m[1]; let v, fl = false;
      if (/^0\d+$/.test(s) && /[89]/.test(s)) throw new CErr(`「${s}」：0 で始まる数は8進数として読まれるので、8 と 9 は使えません`, line);
      if (/^0[bB]/.test(s)) v = parseInt(s.slice(2), 2);
      else if (/^0[xX]/.test(s)) v = parseInt(s.slice(2), 16);
      else if (/[.eE]/.test(s)){ v = parseFloat(s); fl = true; }
      else if (/^0[0-7]+$/.test(s)) v = parseInt(s, 8);
      else v = parseInt(s, 10);
      if (/[0-9A-Za-z_]/.test(src[i + m[0].length] || "")){
        throw new CErr(`「${(rest.match(/^[\w.]+/)||[s])[0]}」は数として読めません（2進数は 0b、16進数は 0x を付ける）`, line);
      }
      toks.push({t:"num", v, fl, line, s:m[0]}); i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(c)){
      m = /^[A-Za-z_]\w*/.exec(rest);
      const name = m[0];
      if (Object.prototype.hasOwnProperty.call(macros, name) && depth < 8){
        const sub = tokenize(macros[name], macros, depth + 1);
        for (const t of sub) toks.push(Object.assign({}, t, {line}));
      } else toks.push({t:"id", v:name, line, s:name});
      i += name.length; continue;
    }
    if (c === '"'){
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"'){
        if (src[j] === "\n") throw new CErr(`" が閉じていません`, line);
        if (src[j] === "\\"){ const e = src[j+1]; s += ({n:"\n", t:"\t", "\\":"\\", '"':'"', "0":""})[e] ?? e; j += 2; continue; }
        s += src[j]; j++;
      }
      if (j >= src.length) throw new CErr(`" が閉じていません`, line);
      toks.push({t:"str", v:s, line, s:'"…"'}); i = j + 1; continue;
    }
    if (c === "'"){
      m = /^'(\\.|[^'\\])'/.exec(rest);
      if (!m) throw new CErr(`文字の書き方が正しくありません`, line);
      const ch = m[1].length === 2 ? ({n:"\n", t:"\t", "0":"\0"})[m[1][1]] ?? m[1][1] : m[1];
      toks.push({t:"num", v:ch.charCodeAt(0), fl:false, line, s:m[0]}); i += m[0].length; continue;
    }
    if (src.startsWith("=<", i) || src.startsWith("=>", i)) throw new CErr(`「${src.substr(i,2)}」ではなく「${src[i+1]}=」と書きます`, line);
    let op = null;
    for (const o of OPS){ if (src.startsWith(o, i)){ op = o; break; } }
    if (op){ toks.push({t:"op", v:op, line, s:op}); i += op.length; continue; }
    throw new CErr(`使えない文字「${c}」があります（全角の文字やコメントの書き忘れに注意）`, line);
  }
  return toks;
}

/* =====================================================================
   Parser
   ===================================================================== */
const TYPE_WORDS = new Set(["void","char","int","short","long","float","double","unsigned","signed","const","volatile","static",
  "uint8_t","int8_t","uint16_t","int16_t","uint32_t","int32_t","bit","bool","_Bool"]);
const KEYWORDS = new Set(["if","else","while","for","do","break","continue","return","switch","case","default","goto","sizeof"]);
const ASSIGN_OPS = new Set(["=","+=","-=","*=","/=","%=","&=","|=","^=","<<=",">>="]);
const LEVELS = [["||"],["&&"],["|"],["^"],["&"],["==","!="],["<",">","<=",">="],["<<",">>"],["+","-"],["*","/","%"]];

function parse(toks, warnings){
  let pos = 0;
  const peek = (o=0) => toks[pos + o];
  const eof = () => pos >= toks.length;
  const lastLine = () => (toks[pos-1] || toks[pos] || {line:1}).line;
  const curLine = () => (toks[pos] || toks[pos-1] || {line:1}).line;
  const is = v => !eof() && toks[pos].v === v && (toks[pos].t === "op" || toks[pos].t === "id");
  const next = () => { if (eof()) throw new CErr("プログラムが途中で終わっています（} の閉じ忘れ？）", lastLine()); return toks[pos++]; };
  function expect(v){
    if (is(v)) return next();
    if (eof()) throw new CErr(`「${v}」が足りません（プログラムの最後）`, lastLine());
    if (v === ";") throw new CErr(`「;」が足りません`, lastLine());
    throw new CErr(`「${v}」が必要です（「${toks[pos].s}」の前）`, curLine());
  }
  const isTypeStart = () => !eof() && toks[pos].t === "id" && TYPE_WORDS.has(toks[pos].v);

  function parseType(){
    const words = [];
    while (isTypeStart()) words.push(next().v);
    const w = new Set(words);
    parseType.isStatic = w.has("static");
    const uns = w.has("unsigned"), sig = w.has("signed");
    if (w.has("float")) return "float";
    if (w.has("double")) return "double";
    if (w.has("bit") || w.has("bool") || w.has("_Bool")) return "bool";
    if (w.has("uint8_t")) return "u8"; if (w.has("int8_t")) return "s8";
    if (w.has("uint16_t")) return "u16"; if (w.has("int16_t")) return "s16";
    if (w.has("uint32_t")) return "u32"; if (w.has("int32_t")) return "i32";
    if (w.has("char")) return sig ? "s8" : "u8";
    if (w.has("short")) return uns ? "u16" : "s16";
    if (w.has("void")) return "void";
    return uns ? "u32" : "i32";
  }

  function parseDecl(){
    const line = curLine();
    const type = parseType();
    const isStatic = parseType.isStatic;
    if (type === "void") throw new CErr("void 型の変数は作れません", line);
    const decls = [];
    do {
      const nt = next();
      if (nt.t !== "id" || KEYWORDS.has(nt.v) || TYPE_WORDS.has(nt.v)) throw new CErr(`変数名が必要です（「${nt.s}」）`, nt.line);
      const d = {name: nt.v, line: nt.line};
      if (is("[")){ next(); d.isArr = true; d.size = is("]") ? null : parseAssign(); expect("]"); }
      if (is("=")){
        next();
        if (is("{")){
          next(); d.list = [];
          while (!is("}")){ d.list.push(parseAssign()); if (is(",")) next(); else break; }
          expect("}");
          if (!d.isArr) throw new CErr(`{ … } で初期化できるのは配列だけです（${d.name}[] と書く）`, nt.line);
        } else {
          if (d.isArr && !eof() && toks[pos].t === "str") throw new CErr(`文字列での配列の初期化（${d.name}[] = "…"）には対応していません。{ 'a', 'b' } のように書きます`, nt.line);
          d.init = parseAssign();
          if (d.isArr) throw new CErr(`配列 ${d.name} は { … } で初期化します`, nt.line);
        }
      }
      if (d.isArr && d.size === null && !d.list) throw new CErr(`配列 ${d.name}[] の大きさがわかりません`, nt.line);
      decls.push(d);
      if (is(",")) next(); else break;
    } while (true);
    expect(";");
    return {k:"Decl", type, decls, line, isStatic};
  }

  function parseBlock(){
    const line = curLine(); expect("{");
    const body = [];
    while (!is("}")){
      if (eof()) throw new CErr("「}」が足りません（{ と } の数を確認）", lastLine());
      body.push(parseStmt());
    }
    next();
    return {k:"Block", body, line};
  }

  function checkCondAssign(cond, kw){
    if (cond && cond.k === "Assign" && cond.op === "=" && !cond.paren)
      warnings.push({line: cond.line, msg:`${kw} の条件が「=」（代入）になっています。比べるなら「==」です`});
  }

  function parseStmt(){
    if (eof()) throw new CErr("プログラムが途中で終わっています", lastLine());
    const t = peek(), line = t.line;
    if (is("{")) return parseBlock();
    if (is(";")){ next(); return {k:"Empty", line}; }
    if (isTypeStart()) return parseDecl();
    if (t.t === "id"){
      switch (t.v){
        case "if": {
          next(); expect("("); const cond = parseExpr(); expect(")");
          checkCondAssign(cond, "if");
          if (is(";")) warnings.push({line, msg:"if (…) の直後に「;」があります。この「;」で if が終わるので、次の文は条件に関係なく必ず実行されます"});
          const then = parseStmt(); let els = null;
          if (is("else")){ next(); els = parseStmt(); }
          return {k:"If", cond, then, els, line};
        }
        case "while": {
          next(); expect("("); const cond = parseExpr(); expect(")");
          checkCondAssign(cond, "while");
          const body = parseStmt();
          return {k:"While", cond, body, line};
        }
        case "do": {
          next(); const body = parseStmt();
          if (!is("while")) throw new CErr("do { … } の後に while(条件); が必要です", curLine());
          next(); expect("("); const cond = parseExpr(); expect(")"); expect(";");
          return {k:"DoWhile", cond, body, line};
        }
        case "for": {
          next(); expect("(");
          let init = null;
          if (is(";")) next();
          else if (isTypeStart()) init = parseDecl();
          else { const e = parseExpr(); expect(";"); init = {k:"Expr", e, line}; }
          const cond = is(";") ? null : parseExpr(); expect(";");
          const upd = is(")") ? null : parseExpr(); expect(")");
          if (is(";") && cond) warnings.push({line, msg:"for (…) の直後に「;」があります。この for は何もしないでくり返すだけになります"});
          const body = parseStmt();
          return {k:"For", init, cond, upd, body, line};
        }
        case "break": next(); expect(";"); return {k:"Break", line};
        case "continue": next(); expect(";"); return {k:"Continue", line};
        case "return": next(); if (!is(";")) parseExpr(); expect(";"); return {k:"Return", line};
        case "else": throw new CErr("対応する if がない else があります（if の後の ; や } を確認）", line);
        case "switch": throw new CErr("switch 文はこのシミュレータでは使えません", line);
      }
    }
    const e = parseExpr();
    expect(";");
    return {k:"Expr", e, line};
  }

  function parseExpr(){
    let a = parseAssign();
    while (is(",")){ const line = curLine(); next(); const b = parseAssign(); a = {k:"Comma", a, b, line}; }
    return a;
  }
  function parseAssign(){
    const left = parseCond();
    if (!eof() && toks[pos].t === "op" && ASSIGN_OPS.has(toks[pos].v)){
      const line = curLine(); const op = next().v;
      if (!["Id","Index"].includes(left.k)) throw new CErr(`「${op}」の左側には変数を書きます`, line);
      const val = parseAssign();
      return {k:"Assign", op, target:left, val, line};
    }
    return left;
  }
  function parseCond(){
    const c = parseBin(0);
    if (is("?")){ const line = curLine(); next(); const a = parseExpr(); expect(":"); const b = parseCond(); return {k:"Cond", c, a, b, line}; }
    return c;
  }
  function parseBin(lv){
    if (lv === LEVELS.length) return parseUnary();
    let l = parseBin(lv + 1);
    while (!eof() && toks[pos].t === "op" && LEVELS[lv].includes(toks[pos].v)){
      const line = curLine(); const op = next().v;
      const r = parseBin(lv + 1);
      if (lv === 6 && l.k === "Bin" && ["<",">","<=",">="].includes(l.op))
        warnings.push({line, msg:`「a ${l.op} x ${op} b」のように比較を2つ続けると、C では思った通りに動きません。「x >= a && x < b」のように && で分けて書きます`});
      l = {k:"Bin", op, l, r, line};
    }
    return l;
  }
  function parseUnary(){
    const line = curLine();
    if (!eof() && toks[pos].t === "op"){
      const v = toks[pos].v;
      if (v === "!" || v === "~" || v === "-" || v === "+"){ next(); return {k:"Un", op:v, a:parseUnary(), line}; }
      if (v === "++" || v === "--"){ next(); const a = parseUnary(); if (!["Id","Index"].includes(a.k)) throw new CErr(`${v} は変数にしか使えません`, line); return {k:"Upd", op:v, prefix:true, a, line}; }
      if (v === "&") throw new CErr("& （アドレス）はこのシミュレータでは使えません（scanf は使えません）", line);
      if (v === "*") throw new CErr("ポインタはこのシミュレータでは使えません", line);
      if (v === "(" && toks[pos+1] && toks[pos+1].t === "id" && TYPE_WORDS.has(toks[pos+1].v)){
        next(); const type = parseType(); expect(")"); return {k:"Cast", type, a:parseUnary(), line};
      }
    }
    return parsePostfix();
  }
  function parsePostfix(){
    let p = parsePrimary();
    while (!eof()){
      const line = curLine();
      if (is("[")){
        next(); const idx = parseExpr(); expect("]");
        if (p.k !== "Id") throw new CErr("[ ] は配列の名前の後に書きます", line);
        p = {k:"Index", name:p.name, idx, line};
      } else if (is("(")){
        next(); const args = [];
        while (!is(")")){ args.push(parseAssign()); if (is(",")) next(); else break; }
        expect(")");
        if (p.k !== "Id") throw new CErr("関数の呼び出し方が正しくありません", line);
        p = {k:"Call", name:p.name, args, line};
      } else if (is("++") || is("--")){
        const op = next().v;
        if (!["Id","Index"].includes(p.k)) throw new CErr(`${op} は変数にしか使えません`, line);
        p = {k:"Upd", op, prefix:false, a:p, line};
      } else if (is(".")){
        next(); const mt = next();
        if (p.k === "Id" && /^(PORT|LAT|TRIS)[AB]bits$/.test(p.name) && mt.t === "id"){
          p = {k:"Id", name: mt.v, line};
        } else throw new CErr("「.」の使い方が正しくありません", line);
      } else break;
    }
    return p;
  }
  function parsePrimary(){
    if (eof()) throw new CErr("式が途中で終わっています", lastLine());
    const t = next();
    if (t.t === "num") return {k:"Num", v:t.v, fl:t.fl, line:t.line};
    if (t.t === "str") return {k:"Str", v:t.v, line:t.line};
    if (t.t === "id"){
      if (t.v === "sizeof") throw new CErr("sizeof はこのシミュレータでは使えません（配列の大きさは数で書く）", t.line);
      if (KEYWORDS.has(t.v) || TYPE_WORDS.has(t.v)) throw new CErr(`「${t.v}」をここには書けません`, t.line);
      return {k:"Id", name:t.v, line:t.line};
    }
    if (t.v === "("){ const e = parseExpr(); expect(")"); e.paren = true; return e; }
    throw new CErr(`「${t.s}」の書き方が正しくありません`, t.line);
  }

  // ---- program ----
  const globals = []; let main = null;
  while (!eof()){
    if (is(";")){ next(); continue; }
    if (!isTypeStart()) throw new CErr(`「${peek().s}」はここには書けません（void main(){ … } の中に書く）`, curLine());
    const start = pos;
    parseType();
    const nt = next();
    if (nt.t !== "id") throw new CErr(`名前が必要です（「${nt.s}」）`, nt.line);
    if (is("(")){
      let depth = 0;
      do { const x = next(); if (x.v === "(") depth++; else if (x.v === ")") depth--; } while (depth > 0);
      if (is(";")){ next(); continue; }
      const body = parseBlock();
      if (nt.v === "main") main = body;
      else throw new CErr(`関数「${nt.v}」は使えません（このシミュレータは main 関数だけに対応）`, nt.line);
    } else {
      pos = start; globals.push(parseDecl());
    }
  }
  if (!main) throw new CErr("void main(){ … } が見つかりません", 1);
  return {globals, main};
}

/* =====================================================================
   実行前のチェック（未宣言の名前・二重宣言・ループの外の break など）
   本物のコンパイラと同じく、実行する前にまとめて見つける
   ===================================================================== */
const REG_NAMES = new Set(["TRISA","TRISB","OSCCON","ADCON0","ADCON1","ANSELA","ANSELB","OPTION_REG","INTCON","CMCON","WPUB","OSCTUNE","CM1CON0","CM2CON0"]);
const BUILTINS = new Set(["printf","__delay_ms","__delay_us","NOP","CLRWDT"]);
function isSpecialName(name){
  return /^(R|LAT|TRIS)[AB][0-7]$/.test(name) || /^(PORT|LAT)[AB]$/.test(name) || REG_NAMES.has(name);
}
function isConstExpr(n){
  if (!n) return true;
  if (n.k === "Num") return true;
  if (n.k === "Un") return isConstExpr(n.a);
  if (n.k === "Bin") return isConstExpr(n.l) && isConstExpr(n.r);
  if (n.k === "Cast") return isConstExpr(n.a);
  return false;
}
function checkProgram(prog){
  const scopes = [new Set()];
  let loops = 0;
  const declared = name => scopes.some(sc => sc.has(name));
  function expr(n){
    if (!n) return;
    switch (n.k){
      case "Id":
        if (!declared(n.name) && !isSpecialName(n.name)){
          if (BUILTINS.has(n.name)) throw new CErr(`${n.name} は ${n.name}(200); のように使います`, n.line);
          throw new CErr(`「${n.name}」が宣言されていません（変数の宣言を忘れていないか、つづりを確認）`, n.line);
        }
        return;
      case "Index":
        if (!declared(n.name)) throw new CErr(`「${n.name}」が宣言されていません（配列の宣言を忘れていないか、つづりを確認）`, n.line);
        return expr(n.idx);
      case "Un": case "Cast": return expr(n.a);
      case "Upd": return expr(n.a);
      case "Bin": expr(n.l); return expr(n.r);
      case "Assign": expr(n.target); return expr(n.val);
      case "Cond": expr(n.c); expr(n.a); return expr(n.b);
      case "Comma": expr(n.a); return expr(n.b);
      case "Call":
        if (n.name === "scanf") throw new CErr("scanf はこのシミュレータでは使えません（入力はスイッチを使う）", n.line);
        if (!BUILTINS.has(n.name)) throw new CErr(`関数「${n.name}」は使えません`, n.line);
        if (n.name === "__delay_ms" || n.name === "__delay_us"){
          if (n.args.length !== 1) throw new CErr(`${n.name}(時間) のように1つだけ数を書きます`, n.line);
          if (!isConstExpr(n.args[0])) throw new CErr(`${n.name} の括弧の中に変数は使えません（数を直接書く）`, n.line);
        }
        n.args.forEach(a => { if (a.k !== "Str") expr(a); });
        return;
    }
  }
  function decl(n){
    const sc = scopes[scopes.length - 1];
    for (const d of n.decls){
      if (d.size) expr(d.size);
      if (d.list) d.list.forEach(expr);
      if (d.init) expr(d.init);
      if (sc.has(d.name)) throw new CErr(`「${d.name}」は同じ場所で2回宣言されています`, d.line);
      if (isSpecialName(d.name)) throw new CErr(`「${d.name}」はマイコンの端子・レジスタの名前なので変数名に使えません`, d.line);
      sc.add(d.name);
    }
  }
  function stmt(n){
    switch (n.k){
      case "Block": scopes.push(new Set()); n.body.forEach(stmt); scopes.pop(); return;
      case "Decl": return decl(n);
      case "Expr": return expr(n.e);
      case "If": expr(n.cond); stmt(n.then); if (n.els) stmt(n.els); return;
      case "While": case "DoWhile": expr(n.cond); loops++; stmt(n.body); loops--; return;
      case "For":
        scopes.push(new Set());
        if (n.init){ if (n.init.k === "Decl") decl(n.init); else expr(n.init.e); }
        expr(n.cond); expr(n.upd);
        loops++; stmt(n.body); loops--;
        scopes.pop(); return;
      case "Break": case "Continue":
        if (!loops) throw new CErr(`${n.k === "Break" ? "break" : "continue"} はループ（while・for・do）の中でしか使えません`, n.line);
        return;
    }
  }
  prog.globals.forEach(decl);
  stmt(prog.main);
}

/* =====================================================================
   Machine
   ===================================================================== */
const COST = 2;                 // µs per statement
const HALT = {halt:true};
const isFloatT = t => t === "float" || t === "double";

function castTo(type, v){
  switch (type){
    case "u8": return Math.trunc(v) & 0xFF;
    case "s8": return (Math.trunc(v) << 24) >> 24;
    case "u16": return Math.trunc(v) & 0xFFFF;
    case "s16": return (Math.trunc(v) << 16) >> 16;
    case "u32": return Math.trunc(v) >>> 0;
    case "float": return Math.fround(v);
    case "double": return +v;
    case "bool": return v ? 1 : 0;
    default: return Math.trunc(v) | 0;
  }
}

function makeMachine(prog, io){
  const st = {latchA:0, latchB:0, regs:{TRISA:0xFF, TRISB:0x00}, line:0, warned:new Set()};
  let scopes = [new Map()];

  const err = (msg, line) => { throw new CErr(msg, line); };
  function lookup(name){
    for (let i = scopes.length - 1; i >= 0; i--){ const v = scopes[i].get(name); if (v) return v; }
    return null;
  }
  const isSpecial = isSpecialName;
  function portAin(){ let v = 0; for (let i = 0; i < 8; i++) v |= (io.readRA(i) << i); return v; }
  function readSpecial(name){
    if (/^RA[0-7]$/.test(name)) return io.readRA(+name[2]);
    if (/^RB[0-7]$/.test(name)) return (st.latchB >> +name[2]) & 1;
    if (/^LATB[0-7]$/.test(name)) return (st.latchB >> +name[4]) & 1;
    if (/^LATA[0-7]$/.test(name)) return (st.latchA >> +name[4]) & 1;
    if (/^TRIS[AB][0-7]$/.test(name)) return ((st.regs["TRIS" + name[4]] || 0) >> +name[5]) & 1;
    if (name === "PORTA") return portAin();
    if (name === "PORTB" || name === "LATB") return st.latchB;
    if (name === "LATA") return st.latchA;
    return st.regs[name] || 0;
  }
  function writeSpecial(name, v, line){
    v = Math.trunc(v);
    if (/^RA[0-7]$/.test(name)){
      if (!st.warned.has(name)){ st.warned.add(name); io.warn(line, `${name} はスイッチの入力なので、書き込んでも変わりません`); }
      return v & 1;
    }
    let bit = -1;
    if (/^RB[0-7]$/.test(name)) bit = +name[2];
    else if (/^LATB[0-7]$/.test(name)) bit = +name[4];
    if (bit >= 0){ st.latchB = (v & 1) ? (st.latchB | (1 << bit)) : (st.latchB & ~(1 << bit)); return v & 1; }
    if (/^LATA[0-7]$/.test(name)){ const b = +name[4]; st.latchA = (v & 1) ? (st.latchA | (1 << b)) : (st.latchA & ~(1 << b)); return v & 1; }
    if (/^TRIS[AB][0-7]$/.test(name)){
      const r = "TRIS" + name[4], b = +name[5], cur = st.regs[r] || 0;
      st.regs[r] = (v & 1) ? (cur | (1 << b)) : (cur & ~(1 << b)); return v & 1;
    }
    if (name === "PORTB" || name === "LATB"){ st.latchB = v & 0xFF; return st.latchB; }
    if (name === "PORTA" || name === "LATA"){ st.latchA = v & 0xFF; return st.latchA; }
    st.regs[name] = v & 0xFF; return st.regs[name];
  }

  function varOf(name, line){
    const v = lookup(name);
    if (!v){
      if (isSpecial(name)) return null;
      if (name === "__delay_ms" || name === "__delay_us") err(`${name} は ${name}(200); のように使います`, line);
      err(`「${name}」が宣言されていません（変数の宣言を忘れていないか、つづりを確認）`, line);
    }
    return v;
  }

  function isF(n){
    switch (n.k){
      case "Num": return n.fl;
      case "Id": { const v = lookup(n.name); return v ? isFloatT(v.type) : false; }
      case "Index": { const v = lookup(n.name); return v ? isFloatT(v.type) : false; }
      case "Un": return (n.op === "-" || n.op === "+") && isF(n.a);
      case "Bin": return ["+","-","*","/"].includes(n.op) && (isF(n.l) || isF(n.r));
      case "Cond": return isF(n.a) || isF(n.b);
      case "Assign": return isF(n.target);
      case "Upd": return isF(n.a);
      case "Cast": return isFloatT(n.type);
      case "Comma": return isF(n.b);
      default: return false;
    }
  }

  function isU32(n){
    if (n.k === "Id" || n.k === "Index"){ const v = lookup(n.name); return !!v && v.type === "u32"; }
    if (n.k === "Cast") return n.type === "u32";
    if (n.k === "Assign") return isU32(n.target);
    if (n.k === "Upd") return isU32(n.a);
    return false;
  }
  function binop(op, a, b, fl, line, uns){
    if (uns && op === ">>") return (Math.trunc(a) >>> 0) >>> Math.trunc(b);
    if (uns && ["<",">","<=",">=","==","!="].includes(op)){ a = Math.trunc(a) >>> 0; b = Math.trunc(b) >>> 0; }
    switch (op){
      case "+": return fl ? a + b : (a + b) | 0;
      case "-": return fl ? a - b : (a - b) | 0;
      case "*": return fl ? a * b : Math.imul(Math.trunc(a), Math.trunc(b));
      case "/": if (b === 0) err("0 で割り算しています", line); return fl ? a / b : Math.trunc(a / b);
      case "%": if (fl) err("% は整数にしか使えません", line); if (b === 0) err("0 で割った余りを計算しています", line); return Math.trunc(a) % Math.trunc(b);
      case "<<": return Math.trunc(a) << Math.trunc(b);
      case ">>": return Math.trunc(a) >> Math.trunc(b);
      case "&": return Math.trunc(a) & Math.trunc(b);
      case "|": return Math.trunc(a) | Math.trunc(b);
      case "^": return Math.trunc(a) ^ Math.trunc(b);
      case "==": return a === b ? 1 : 0;
      case "!=": return a !== b ? 1 : 0;
      case "<": return a < b ? 1 : 0;
      case ">": return a > b ? 1 : 0;
      case "<=": return a <= b ? 1 : 0;
      case ">=": return a >= b ? 1 : 0;
    }
    err(`演算子 ${op} は使えません`, line);
  }

  function arrRef(n){
    const v = varOf(n.name, n.line);
    if (!v) err(`${n.name} は配列ではありません`, n.line);
    if (!v.arr) err(`${n.name} は配列ではないので [ ] は使えません`, n.line);
    const i = Math.trunc(ev(n.idx));
    if (i < 0 || i >= v.arr.length){
      const hint = (i === 255 || i === 65535 || i === 4294967295) ? "。unsigned 型の変数は 0 から 1 引くとマイナスにならず最大値に戻るので、cnt >= 0 の条件はずっと成り立ちます" : "";
      err(`${n.name}[${i}] は配列の範囲外です（${n.name} の番号は 0〜${v.arr.length - 1}）${hint}`, n.line);
    }
    return {v, i};
  }

  /* 代入先の場所を1回だけ求める（a[i++] += 1 で i++ が2回動かないように） */
  function lref(t, line){
    if (t.k === "Index"){
      const r = arrRef(t);
      return {get: () => r.v.arr[r.i], set: val => (r.v.arr[r.i] = castTo(r.v.type, val))};
    }
    if (t.k === "Id") return {get: () => ev(t), set: val => store(t, val, line)};
    err("ここには代入できません", line);
  }
  function store(t, val, line){
    if (t.k === "Id"){
      const v = varOf(t.name, t.line);
      if (!v) return writeSpecial(t.name, val, line);
      if (v.arr) err(`配列 ${t.name} にはまとめて代入できません（${t.name}[番号] = … と書く）`, line);
      v.v = castTo(v.type, val); return v.v;
    }
    if (t.k === "Index"){ const r = arrRef(t); r.v.arr[r.i] = castTo(r.v.type, val); return r.v.arr[r.i]; }
    err("ここには代入できません", line);
  }

  function ev(n){
    switch (n.k){
      case "Num": return n.v;
      case "Str": err("文字列は printf の中でしか使えません", n.line); break;
      case "Id": {
        const v = varOf(n.name, n.line);
        if (!v) return readSpecial(n.name);
        if (v.arr) err(`配列 ${n.name} は ${n.name}[番号] のように使います`, n.line);
        return v.v;
      }
      case "Index": { const r = arrRef(n); return r.v.arr[r.i]; }
      case "Un": {
        const a = ev(n.a);
        if (n.op === "!") return a ? 0 : 1;
        if (n.op === "~") return ~Math.trunc(a);
        if (n.op === "-") return isF(n.a) ? -a : (-a) | 0;
        return a;
      }
      case "Bin": {
        if (n.op === "&&") return ev(n.l) ? (ev(n.r) ? 1 : 0) : 0;
        if (n.op === "||") return ev(n.l) ? 1 : (ev(n.r) ? 1 : 0);
        const a = ev(n.l), b = ev(n.r);
        return binop(n.op, a, b, isF(n.l) || isF(n.r), n.line, isU32(n.l) || isU32(n.r));
      }
      case "Cond": return ev(n.c) ? ev(n.a) : ev(n.b);
      case "Assign": {
        const ref = lref(n.target, n.line);
        let val = ev(n.val);
        if (n.op !== "="){
          val = binop(n.op.slice(0, -1), ref.get(), val, isF(n.target) || isF(n.val), n.line, isU32(n.target));
        }
        return ref.set(val);
      }
      case "Upd": {
        const ref = lref(n.a, n.line);
        const old = ref.get();
        const nv = ref.set(n.op === "++" ? old + 1 : old - 1);
        return n.prefix ? nv : old;
      }
      case "Cast": return castTo(n.type, ev(n.a));
      case "Comma": ev(n.a); return ev(n.b);
      case "Call": {
        if (n.name === "printf"){ doPrintf(n); return 0; }
        if (n.name === "__delay_ms" || n.name === "__delay_us") err(`${n.name}(…) は1つの文として書いてください`, n.line);
        if (n.name === "scanf") err("scanf はこのシミュレータでは使えません（入力はスイッチを使う）", n.line);
        if (n.name === "NOP" || n.name === "CLRWDT") return 0;
        err(`関数「${n.name}」は使えません`, n.line);
      }
    }
    err("この式は計算できません", n.line);
  }

  function doPrintf(n){
    if (!n.args.length || n.args[0].k !== "Str") err("printf の最初には \"…\" を書きます", n.line);
    const fmt = n.args[0].v; let ai = 1; let out = "";
    for (let i = 0; i < fmt.length; i++){
      const c = fmt[i];
      if (c !== "%"){ out += c; continue; }
      const m = /^%([-+ 0#]*)(\d*)(?:\.(\d+))?(hh|h|ll|l)?([diufxXcs%])/.exec(fmt.slice(i));
      if (!m){ out += c; continue; }
      i += m[0].length - 1;
      if (m[5] === "%"){ out += "%"; continue; }
      const argN = n.args[ai++];
      if (!argN){ out += "?"; continue; }
      let s;
      if (m[5] === "s"){ s = argN.k === "Str" ? argN.v : String(ev(argN)); }
      else {
        const v = ev(argN);
        switch (m[5]){
          case "d": case "i": s = String(Math.trunc(v)); break;
          case "u": s = String(Math.trunc(v) >>> 0); break;
          case "f": s = Number(v).toFixed(m[3] !== undefined ? +m[3] : 6); break;
          case "x": s = (Math.trunc(v) >>> 0).toString(16); break;
          case "X": s = (Math.trunc(v) >>> 0).toString(16).toUpperCase(); break;
          case "c": s = String.fromCharCode(Math.trunc(v) & 0xFF); break;
        }
      }
      const w = +(m[2] || 0);
      if (s.length < w) s = m[1].includes("-") ? s.padEnd(w) : s.padStart(w, m[1].includes("0") ? "0" : " ");
      out += s;
    }
    io.print(out);
  }

  const isConst = isConstExpr;
  const constTrue = n => n === null || (isConst(n) && !!ev(n));
  const isEmpty = b => b.k === "Empty" || (b.k === "Block" && b.body.every(isEmpty));

  function declare(d, type, isStatic){
    const scope = scopes[scopes.length - 1];
    if (isStatic && d._static){ scope.set(d.name, d._static); return; }   // static は最初の1回だけ初期化
    if (d.isArr){
      let len = d.size ? Math.trunc(ev(d.size)) : d.list.length;
      if (d.size && !isConst(d.size) && !lookup(d.size.name)) {} // allow macros (already numbers)
      if (len <= 0) err(`配列 ${d.name} の大きさが正しくありません`, d.line);
      if (d.list && d.list.length > len) err(`配列 ${d.name} の初期値が多すぎます（大きさ ${len}）`, d.line);
      const arr = new Array(len).fill(0);
      if (d.list) d.list.forEach((e, i) => arr[i] = castTo(type, ev(e)));
      scope.set(d.name, {type, arr});
      if (isStatic) d._static = scope.get(d.name);
    } else {
      if (isSpecial(d.name)) err(`「${d.name}」はマイコンの端子・レジスタの名前なので変数名に使えません`, d.line);
      scope.set(d.name, {type, v: d.init ? castTo(type, ev(d.init)) : 0});
      if (isStatic) d._static = scope.get(d.name);
    }
  }

  function* exec(n){
    switch (n.k){
      case "Block": {
        scopes.push(new Map());
        try {
          for (const s of n.body){ const r = yield* exec(s); if (r) return r; }
        } finally { scopes.pop(); }
        return;
      }
      case "Empty": return;
      case "Decl": st.line = n.line; yield COST; for (const d of n.decls) declare(d, n.type, n.isStatic); return;
      case "Expr": {
        st.line = n.line;
        const e = n.e;
        if (e.k === "Call" && (e.name === "__delay_ms" || e.name === "__delay_us")){
          if (e.args.length !== 1) err(`${e.name}(時間) のように1つだけ数を書きます`, n.line);
          if (!isConst(e.args[0])) err(`${e.name} の括弧の中に変数は使えません（数を直接書く）`, n.line);
          const t = ev(e.args[0]);
          if (t < 0) err("待ち時間がマイナスです", n.line);
          yield COST;
          yield e.name === "__delay_ms" ? t * 1000 : t;
          return;
        }
        yield COST; ev(e); return;
      }
      case "If": {
        st.line = n.line; yield COST;
        if (ev(n.cond)) return yield* exec(n.then);
        else if (n.els) return yield* exec(n.els);
        return;
      }
      case "While": {
        if (constTrue(n.cond) && isEmpty(n.body)){ st.line = n.line; yield HALT; return; }
        while (true){
          st.line = n.line; yield COST;
          if (!ev(n.cond)) break;
          const r = yield* exec(n.body);
          if (r === "break") break;
          if (r === "return") return r;
        }
        return;
      }
      case "DoWhile": {
        while (true){
          const r = yield* exec(n.body);
          if (r === "break") break;
          if (r === "return") return r;
          st.line = n.line; yield COST;
          if (!ev(n.cond)) break;
        }
        return;
      }
      case "For": {
        scopes.push(new Map());
        try {
          if (n.init){ if (n.init.k === "Decl"){ st.line = n.line; yield COST; for (const d of n.init.decls) declare(d, n.init.type, n.init.isStatic); } else { st.line = n.line; yield COST; ev(n.init.e); } }
          if (n.cond === null && isEmpty(n.body)){ st.line = n.line; yield HALT; return; }
          while (true){
            st.line = n.line; yield COST;
            if (n.cond && !ev(n.cond)) break;
            const r = yield* exec(n.body);
            if (r === "break") break;
            if (r === "return") return r;
            if (n.upd){ st.line = n.line; yield COST; ev(n.upd); }
          }
        } finally { scopes.pop(); }
        return;
      }
      case "Break": return "break";
      case "Continue": return "continue";
      case "Return": st.line = n.line; yield COST; return "return";
    }
  }

  function* program(){
    for (const g of prog.globals) yield* exec(g);
    yield* exec(prog.main);
  }
  return {st, gen: program()};
}
