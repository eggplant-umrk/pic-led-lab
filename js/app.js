/* 画面（エディタ・LED・スイッチ）とシミュレーションのループ */
"use strict";
/* =====================================================================
   UI state
   ===================================================================== */
const $ = id => document.getElementById(id);
const codeEl = $("code"), gutterEl = $("gutter");
const store = {
  get(k, d){ try { const v = localStorage.getItem("picledlab." + k); return v === null ? d : v; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem("picledlab." + k, v); } catch(e){} }
};

let mode = store.get("mode", "row8");
let swPull = (store.get("sw", "up,up,up,up,up")).split(",");
if (swPull.length !== 5) swPull = ["up","up","up","up","up"];
const swHeld = [false,false,false,false,false], swLock = [false,false,false,false,false];
const swPressed = i => swHeld[i] || swLock[i];
const raLevel = i => i > 4 ? 0 : (swPressed(i) ? (swPull[i] === "up" ? 0 : 1) : (swPull[i] === "up" ? 1 : 0));

let machine = null, runState = "off", simTime = 0, waitLeft = 0, curLine = 0, errLine = 0, runWarnings = [];
let speed = parseFloat(store.get("speed", "1")) || 1;
let codeDirty = false;
const onTime = new Float64Array(16);
const shown = new Float64Array(16);

codeEl.value = store.get("code", DEFAULT_CODE);

/* ---------- gutter ---------- */
let lastGutterKey = "";
function renderGutter(){
  const n = codeEl.value.split("\n").length;
  const key = n + ":" + curLine + ":" + errLine;
  if (key === lastGutterKey) return;
  lastGutterKey = key;
  let html = "";
  for (let i = 1; i <= n; i++){
    const cls = i === errLine ? "err" : (i === curLine && (runState === "running" || runState === "halted") ? "cur" : "");
    html += `<span${cls ? ` class="${cls}"` : ""}>${i}</span>`;
  }
  gutterEl.innerHTML = html;
  gutterEl.scrollTop = codeEl.scrollTop;
}
codeEl.addEventListener("scroll", () => { gutterEl.scrollTop = codeEl.scrollTop; });
codeEl.addEventListener("input", () => {
  store.set("code", codeEl.value);
  if (errLine){ errLine = 0; }
  if (runState === "running" || runState === "halted" || runState === "ended"){
    codeDirty = true;
    $("editNote").textContent = "コードが変わりました。「▶ 書き込んで実行」で反映されます";
  }
  renderGutter();
});
/* ---------- editor: indentation ---------- */
const INDENT = 4;
/* start..end を text に置きかえる。execCommand を使うと Ctrl+Z で戻せる */
function replaceRange(start, end, text){
  codeEl.focus();
  codeEl.setSelectionRange(start, end);
  let ok = false;
  try { ok = document.execCommand(text === "" ? "delete" : "insertText", false, text); } catch (e) { ok = false; }
  if (!ok || codeEl.value.slice(start, start + text.length) !== text){
    codeEl.setRangeText(text, start, end, "end");
    codeEl.dispatchEvent(new Event("input"));
  }
}
function insertText(txt){ replaceRange(codeEl.selectionStart, codeEl.selectionEnd, txt); }
const lineStartOf = pos => codeEl.value.lastIndexOf("\n", pos - 1) + 1;
const prevStop = n => Math.floor((n - 1) / INDENT) * INDENT;   // 一つ前の4の倍数（n>0）

/* 複数行をまとめてインデント（dir=+1）／戻す（dir=-1） */
function shiftLines(dir){
  const v = codeEl.value;
  let s = codeEl.selectionStart, e = codeEl.selectionEnd;
  if (e > s && v[e - 1] === "\n") e--;            // 次の行の先頭で終わる選択は、その行を含めない
  const from = lineStartOf(s);
  let to = v.indexOf("\n", e); if (to < 0) to = v.length;
  const lines = v.slice(from, to).split("\n");
  const out = lines.map(l => {
    if (dir > 0) return l.length ? " ".repeat(INDENT) + l : l;
    const m = /^ */.exec(l)[0].length;
    return l.slice(Math.min(m, INDENT));
  }).join("\n");
  if (out === v.slice(from, to)) return;
  replaceRange(from, to, out);
  codeEl.setSelectionRange(from, from + out.length);
}

codeEl.addEventListener("keydown", ev => {
  if (ev.isComposing || ev.keyCode === 229) return;          // 日本語の変換中は何もしない
  const v = codeEl.value, s = codeEl.selectionStart, e = codeEl.selectionEnd;
  const ls = lineStartOf(s), before = v.slice(ls, s);
  const multi = v.slice(s, e).includes("\n");

  if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter"){ ev.preventDefault(); run(); return; }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

  if (ev.key === "Tab"){
    ev.preventDefault();
    if (multi){ shiftLines(ev.shiftKey ? -1 : 1); return; }
    if (ev.shiftKey){
      const m = Math.min(/^ */.exec(v.slice(ls))[0].length, INDENT);
      if (!m) return;
      replaceRange(ls, ls + m, "");
      const caret = Math.max(ls, s - m);
      codeEl.setSelectionRange(caret, Math.max(caret, e - m));
      return;
    }
    const col = s - ls;
    insertText(" ".repeat(INDENT - (col % INDENT)));
    return;
  }
  if (ev.key === "Backspace" && s === e && before.length > 0 && /^ +$/.test(before)){
    ev.preventDefault();
    replaceRange(ls + prevStop(before.length), s, "");
    return;
  }
  if (ev.key === "}" && s === e && before.length > 0 && /^ +$/.test(before)){
    ev.preventDefault();
    replaceRange(ls, s, " ".repeat(prevStop(before.length)) + "}");
    return;
  }
  if (ev.key === "Enter"){
    const indent = /^ */.exec(before)[0];
    const extra = /\{\s*$/.test(before) ? " ".repeat(INDENT) : "";
    ev.preventDefault(); insertText("\n" + indent + extra);
  }
});

/* ---------- messages ---------- */
function showMsgs(list){
  const box = $("msgs"); box.innerHTML = "";
  for (const m of list){
    const d = document.createElement("div");
    d.className = "msg " + m.kind;
    d.textContent = (m.line ? m.line + "行目：" : "") + m.msg;
    box.appendChild(d);
  }
}
let consoleText = "";
function printOut(s){
  consoleText += s;
  if (consoleText.length > 6000) consoleText = consoleText.slice(-6000);
  consoleDirty = true;
}
let consoleDirty = false;
function flushConsole(){
  if (!consoleDirty) return; consoleDirty = false;
  const c = $("console"); c.hidden = false; c.textContent = consoleText; c.scrollTop = c.scrollHeight;
}

/* ---------- switches ---------- */
function buildSwitches(){
  const box = $("sws"); box.innerHTML = "";
  for (let i = 0; i < 5; i++){
    const w = document.createElement("div"); w.className = "sw";
    w.innerHTML = `<span class="pin">RA${i}</span>
      <button class="btn-sw" type="button" id="swb${i}" aria-label="RA${i} のスイッチ（押している間オン）"></button>
      <span class="volt" id="swv${i}"></span>
      <label class="lock"><input type="checkbox" id="swl${i}">押したまま</label>
      <select id="sws${i}" aria-label="RA${i} の回路">
        <option value="up">プルアップ（押すとLow）</option>
        <option value="down">プルダウン（押すとHigh）</option>
      </select>`;
    box.appendChild(w);
    const b = w.querySelector("button"), sel = w.querySelector("select"), lk = w.querySelector("input");
    sel.value = swPull[i];
    const press = v => { swHeld[i] = v; updateSwitchUI(); };
    b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch(_){} press(true); });
    b.addEventListener("pointerup", () => press(false));
    b.addEventListener("pointercancel", () => press(false));
    b.addEventListener("lostpointercapture", () => press(false));
    b.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat){ e.preventDefault(); press(true); } });
    b.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter"){ e.preventDefault(); press(false); } });
    b.addEventListener("contextmenu", e => e.preventDefault());
    lk.addEventListener("change", () => { swLock[i] = lk.checked; updateSwitchUI(); });
    sel.addEventListener("change", () => { swPull[i] = sel.value; store.set("sw", swPull.join(",")); updateSwitchUI(); });
  }
  updateSwitchUI();
}
function updateSwitchUI(){
  for (let i = 0; i < 5; i++){
    const b = $("swb" + i); if (!b) continue;
    b.classList.toggle("down", swPressed(i));
    const lv = raLevel(i), v = $("swv" + i);
    v.textContent = lv ? "5V High(1)" : "0V Low(0)";
    v.className = "volt " + (lv ? "h" : "l");
    $("sws" + i).value = swPull[i];
    $("swl" + i).checked = swLock[i];
  }
}

/* ---------- LEDs ---------- */
let ledEls = [];
function buildLeds(){
  const area = $("ledArea"); area.innerHTML = ""; ledEls = new Array(16).fill(null);
  if (mode === "row8"){
    $("ledTitle").textContent = "LED（RB → 300Ω → LED → GND、Highで点灯）";
    const g = document.createElement("div"); g.className = "leds";
    for (let b = 7; b >= 0; b--){
      const w = document.createElement("div"); w.className = "led-wrap";
      w.innerHTML = `<div class="led red"></div><span class="pin">RB${b}</span>`;
      g.appendChild(w); ledEls[b] = w.firstElementChild;
    }
    area.appendChild(g);
  } else {
    $("ledTitle").textContent = "列 RB0〜RB3 → 220Ω、緑の共通線 RB7、赤の共通線 RB6（電流は High → Low へ）";
    const g = document.createElement("div"); g.className = "dyn";
    g.appendChild(Object.assign(document.createElement("span"), {className:"lab", textContent:""}));
    for (let j = 0; j < 4; j++) g.appendChild(Object.assign(document.createElement("span"), {className:"pin", textContent:`RB${j}`}));
    g.appendChild(Object.assign(document.createElement("span"), {className:"lab", innerHTML:"緑<br>RB7"}));
    for (let j = 0; j < 4; j++){ const d = document.createElement("div"); d.className = "led green"; g.appendChild(d); ledEls[8 + j] = d; }
    g.appendChild(Object.assign(document.createElement("span"), {className:"lab", innerHTML:"赤<br>RB6"}));
    for (let j = 0; j < 4; j++){ const d = document.createElement("div"); d.className = "led red"; g.appendChild(d); ledEls[12 + j] = d; }
    area.appendChild(g);
  }
  shown.fill(0);
}
function litMask(){
  if (!machine || runState === "off") return 0;
  const out = machine.st.latchB & ~machine.st.regs.TRISB & 0xFF;   // driven High
  const driveLow = ~machine.st.latchB & ~machine.st.regs.TRISB & 0xFF; // driven Low
  if (mode === "row8") return out;
  let m = 0;
  for (let j = 0; j < 4; j++){
    if ((out >> j) & 1){
      if ((driveLow >> 7) & 1) m |= 1 << (8 + j);
      if ((driveLow >> 6) & 1) m |= 1 << (12 + j);
    }
  }
  return m;
}
function integrate(dt){
  if (dt <= 0) return;
  const m = litMask();
  if (!m) return;
  for (let i = 0; i < 16; i++) if ((m >> i) & 1) onTime[i] += dt;
}

/* ---------- bits readout ---------- */
function buildBits(){
  const b = $("bits"); let h = `<span></span>`;
  for (let i = 7; i >= 0; i--) h += `<span class="hd">${i}</span>`;
  for (const p of ["PORTB","PORTA"]){
    h += `<span class="name">${p}</span>`;
    for (let i = 7; i >= 0; i--) h += `<span class="b" id="bit${p}${i}">0</span>`;
    h += `<span class="val" id="val${p}"></span>`;
  }
  b.innerHTML = h;
}
function renderBits(){
  const pb = machine && runState !== "off" ? machine.st.latchB : 0;
  let pa = 0; for (let i = 0; i < 5; i++) pa |= raLevel(i) << i;
  for (const [p, v] of [["PORTB", pb], ["PORTA", pa]]){
    for (let i = 7; i >= 0; i--){
      const el = $("bit" + p + i); const on = (v >> i) & 1;
      el.textContent = on; el.classList.toggle("h", !!on);
    }
    $("val" + p).textContent = `= 0b${v.toString(2).padStart(8,"0")} = 0x${v.toString(16).toUpperCase().padStart(2,"0")} = ${v}` + (p === "PORTA" ? "（RA0〜RA4 のスイッチ）" : "");
  }
}

/* ---------- status ---------- */
function setStatus(){
  const dot = $("dot"), t = $("statusText");
  dot.className = "dot";
  if (runState === "off"){ t.textContent = "電源OFF"; }
  else if (runState === "running"){ dot.classList.add("on"); t.textContent = `実行中（${curLine}行目）`; }
  else if (runState === "halted"){ dot.classList.add("halt"); t.textContent = `while(1); で停止中（${curLine}行目）。出力はそのまま`; }
  else if (runState === "ended"){ dot.classList.add("halt"); t.textContent = "main 関数が最後まで終了。出力はそのまま保持"; }
  else if (runState === "error"){ dot.classList.add("err"); t.textContent = "エラーで停止"; }
  $("subText").textContent = `経過時間 ${(simTime / 1e6).toFixed(3)} 秒`;
}

/* =====================================================================
   Run / stop
   ===================================================================== */
function compile(){
  let src = normalize(codeEl.value);
  if (!/\bmain\s*\(/.test(src)) src = "void main(){ " + src + "\n}";
  const warnings = [];
  const toks = tokenize(src);
  for (const t of toks){
    if (t.t === "num" && !t.fl && /^(0[01]{3,}|[01]{5,})$/.test(t.s))
      warnings.push({line:t.line, msg:`${t.s} は2進数ではなく${t.s[0]==="0"?"8進数":"10進数"}として読まれます。2進数なら 0b${t.s.replace(/^0+(?=.)/,"").padStart(t.s.length,"0")} のように 0b を付けます`});
  }
  const prog = parse(toks, warnings);
  return {prog, warnings};
}

function run(){
  errLine = 0; consoleText = ""; $("console").hidden = true; $("console").textContent = "";
  runWarnings = [];
  let compiled;
  try { compiled = compile(); }
  catch (e){
    if (!(e instanceof CErr)) throw e;
    machine = null; runState = "error"; errLine = e.line || 0;
    showMsgs([{kind:"error", line:e.line, msg:e.message}]);
    lastGutterKey = ""; renderGutter(); setStatus(); renderBits(); paintLeds(true);
    return;
  }
  runWarnings = compiled.warnings.map(w => ({kind:"warn", line:w.line, msg:w.msg}));
  machine = makeMachine(compiled.prog, {
    readRA: raLevel,
    print: printOut,
    warn: (line, msg) => { runWarnings.push({kind:"warn", line, msg}); showMsgs(runWarnings); }
  });
  simTime = 0; waitLeft = 0; onTime.fill(0); shown.fill(0);
  runState = "running"; codeDirty = false;
  $("editNote").textContent = "main 関数の中身だけでも動く（void main(){ は自動で補う）";
  showMsgs(runWarnings);
  lastGutterKey = ""; renderGutter(); setStatus();
}
const NOTE = "main 関数の中身だけでも動く（void main(){ は自動で補う）";
function stop(){
  codeDirty = false; $("editNote").textContent = NOTE;
  machine = null; runState = "off"; curLine = 0; simTime = 0; waitLeft = 0;
  onTime.fill(0); shown.fill(0);
  lastGutterKey = ""; renderGutter(); setStatus(); renderBits(); paintLeds(true);
}

/* step the program for `budget` µs of simulated time */
function simulate(budget){
  let t = 0, steps = 0;
  while (t < budget){
    if (runState !== "running"){ integrate(budget - t); simTime += budget - t; t = budget; break; }
    if (waitLeft > 0){
      const take = Math.min(waitLeft, budget - t);
      integrate(take); t += take; simTime += take; waitLeft -= take;
      continue;
    }
    if (++steps > 400000){ break; }
    let r;
    try { r = machine.gen.next(); }
    catch (e){
      if (!(e instanceof CErr)) { console.error(e); e = new CErr("内部エラー：" + e.message, machine.st.line); }
      runState = "error"; errLine = e.line || machine.st.line;
      showMsgs(runWarnings.concat([{kind:"error", line:errLine, msg:"実行中のエラー：" + e.message}]));
      lastGutterKey = ""; break;
    }
    curLine = machine.st.line;
    if (r.done){
      runState = "ended";
      showMsgs(runWarnings.concat([{kind:"info", msg:"main 関数が最後まで終わりました。出力端子は最後の状態のまま保持されます。プログラムはもう動いていないので、スイッチを押しても反応しません。止めたい場所には while(1); を書こう。"}]));
      continue;
    }
    if (r.value === HALT){ runState = "halted"; continue; }
    waitLeft = r.value;
  }
  return t;
}

function paintLeds(force){
  for (let i = 0; i < 16; i++){
    const el = ledEls[i]; if (!el) continue;
    if (force){ shown[i] = 0; el.style.setProperty("--on", "0"); }
  }
}

let lastT = performance.now();
function frame(now){
  const realDt = Math.min(now - lastT, 100); lastT = now;
  if (machine && runState !== "off" && runState !== "error"){
    onTime.fill(0);
    const budget = realDt * 1000 * speed;
    const adv = simulate(budget);
    for (let i = 0; i < 16; i++){
      const el = ledEls[i]; if (!el) continue;
      const duty = adv > 0 ? onTime[i] / adv : 0;
      const target = duty <= 0 ? 0 : 0.4 + 0.6 * Math.min(1, duty * 2);
      shown[i] = Math.max(target, shown[i] * 0.55);
      if (shown[i] < 0.02) shown[i] = 0;
      el.style.setProperty("--on", shown[i].toFixed(3));
    }
    renderGutter(); setStatus(); renderBits();
  } else {
    renderBits();
  }
  flushConsole();
  requestAnimationFrame(frame);
}

/* =====================================================================
   Wiring
   ===================================================================== */
const taskSel = $("taskSel");
(function buildTaskOptions(){
  let group = null, lastLec;
  for (const t of TASKS){
    const o = document.createElement("option"); o.value = t.id;
    if (t.lec === null){ o.textContent = t.title; taskSel.appendChild(o); continue; }
    if (t.lec !== lastLec){ group = document.createElement("optgroup"); group.label = lecName(t.lec); taskSel.appendChild(group); lastLec = t.lec; }
    o.textContent = `${taskTag(t)}　${t.title}`;
    group.appendChild(o);
  }
})();
const isPristine = c => !c.trim() || c === STARTER || TASKS.some(t => t.answer === c);

function showTask(t){
  if (!t || t.id === "free"){ $("taskBox").hidden = true; return; }
  $("taskBox").hidden = false;
  $("taskTitle").textContent = t.title; $("taskText").textContent = t.text;
  const meta = $("taskMeta"); meta.innerHTML = "";
  const chip = (txt, cls) => { const sp = document.createElement("span"); sp.className = "chip" + (cls ? " " + cls : ""); sp.textContent = txt; meta.appendChild(sp); };
  chip(lecName(t.lec), "lec");
  if (t.paper) chip("授業資料 紙" + t.paper);
  if (t.quiz) chip("対策サイト " + (t.lec === "mock" ? t.quiz : "問" + t.quiz));
  const link = $("studyLink");
  if (t.study){ link.hidden = false; link.href = STUDY_URL + "#" + t.study; }
  else link.hidden = true;
}
function selectTask(t, opts){
  opts = opts || {};
  t = t || TASKS[0];
  taskSel.value = t.id;
  store.set("task", t.id);
  showTask(t);
  if (t.id !== "free"){
    mode = t.mode; $("modeSel").value = mode; store.set("mode", mode); buildLeds();
    swPull = t.sw.slice(); store.set("sw", swPull.join(",")); swLock.fill(false); updateSwitchUI();
  }
  if (opts.fromHash && t.id !== "free" && isPristine(codeEl.value)){
    codeEl.value = STARTER; codeEl.dispatchEvent(new Event("input"));
  }
  if (!opts.fromHash){
    try {
      if (t.id === "free") history.replaceState(null, "", location.pathname + location.search);
      else if (location.hash !== "#" + t.id) location.hash = t.id;
    } catch (e) {}
  }
  stop();
}
taskSel.addEventListener("change", () => selectTask(findTask(taskSel.value)));
function openFromHash(){
  const t = findTask(decodeURIComponent((location.hash || "").slice(1)));
  if (t && t.id !== taskSel.value) selectTask(t, {fromHash:true});
}
window.addEventListener("hashchange", openFromHash);
$("starterBtn").addEventListener("click", () => { codeEl.value = STARTER; codeEl.dispatchEvent(new Event("input")); stop(); codeEl.focus(); codeEl.setSelectionRange(17, 17); });
$("answerBtn").addEventListener("click", () => {
  const t = findTask(taskSel.value); if (!t || !t.answer) return;
  codeEl.value = t.answer; codeEl.dispatchEvent(new Event("input")); stop();
});
$("modeSel").value = mode;
$("modeSel").addEventListener("change", e => { mode = e.target.value; store.set("mode", mode); buildLeds(); });
$("speedSel").value = String(speed);
if ($("speedSel").value !== String(speed)){ speed = 1; $("speedSel").value = "1"; }
$("speedSel").addEventListener("change", e => { speed = parseFloat(e.target.value); store.set("speed", e.target.value); });
$("runBtn").addEventListener("click", run);
$("runBtn2").addEventListener("click", run);
$("stopBtn").addEventListener("click", stop);
$("copyBtn").addEventListener("click", () => {
  const b = $("copyBtn");
  const done = ok => { b.textContent = ok ? "コピーしました" : "選択したので Ctrl+C でコピー"; setTimeout(() => b.textContent = "コードをコピー", 1800); };
  try {
    navigator.clipboard.writeText(codeEl.value).then(() => done(true), () => { codeEl.select(); done(false); });
  } catch (e){ codeEl.select(); done(false); }
});

buildSwitches(); buildLeds(); buildBits();
{
  const fromHash = findTask(decodeURIComponent((location.hash || "").slice(1)));
  if (fromHash) selectTask(fromHash, {fromHash:true});
  else { const saved = findTask(store.get("task", "free")) || TASKS[0]; taskSel.value = saved.id; showTask(saved); }
}
renderGutter(); setStatus(); renderBits();
requestAnimationFrame(frame);

/* test hook */
window.__picLabTasks = TASKS;
window.__picLab = {compile:() => compile(), get state(){ return {runState, latchB: machine ? machine.st.latchB : 0, curLine, simTime}; },
  simulate:(us) => { onTime.fill(0); const a = simulate(us); return {adv:a, on:Array.from(onTime)}; }, run, stop,
  press:(i, v) => { swLock[i] = v; updateSwitchUI(); }, setPull:(i, v) => { swPull[i] = v; updateSwitchUI(); },
  setMode:(m) => { mode = m; buildLeds(); }, setCode:(c) => { codeEl.value = c; }};
