// ブラウザ（Playwright の Chromium）でページを開き、練習問題の解答例・URL での問題指定・
// エディタのインデント操作・よくある間違いの検出を確かめる。実行: npm test
const path = require("path");
const { chromium } = require("playwright");

const PAGE = "file://" + path.resolve(__dirname, "..", "index.html");
const results = [];
const check = (name, ok, detail) => results.push({name, ok: !!ok, detail});

async function openPage(browser, hash){
  const page = await browser.newPage();
  page.__errors = [];
  page.on("pageerror", e => page.__errors.push(e.message));
  await page.goto(PAGE + (hash ? "#" + hash : ""));
  await page.waitForFunction(() => window.__picLab);
  return page;
}

(async () => {
  const browser = await chromium.launch();

  /* ---------- 1. 練習問題の解答例 ---------- */
  const page = await openPage(browser);
  const r = await page.evaluate(() => {
    const L = window.__picLab;
    const sel = document.getElementById("taskSel");
    const out = [];
    const check = (name, ok, detail) => out.push({name, ok: !!ok, detail});
    const msgs = () => Array.from(document.querySelectorAll(".msg")).map(x => x.textContent);
    const load = id => { sel.value = id; sel.dispatchEvent(new Event("change")); document.getElementById("answerBtn").click(); };
    const duty = us => { const d = L.simulate(us); return d.on.map(x => Math.round(x / d.adv * 100)); };
    const runCode = (code, us = 200000) => { L.setCode(code); L.run(); L.simulate(us); return {state: L.state.runState, portb: L.state.latchB, msgs: msgs()}; };
    const pressRun = (id, pressed, us) => { load(id); pressed.forEach(i => L.press(i, true)); L.run(); L.simulate(us); const b = L.state.latchB; pressed.forEach(i => L.press(i, false)); return b; };

    // 全問：エラーなく動き、何かしら LED が光る
    for (const t of window.__picLabTasks){
      if (!t.answer || t.id === "k3-3") continue;   // k3-3 はわざと何もしないで終わる例なので、下で個別に確かめる
      load(t.id); L.run(); L.simulate(1000);
      const d = L.simulate(400000);
      const lit = d.on.some(x => x > 0) || L.state.latchB !== 0;
      const st = L.state.runState;
      // スイッチが関係する問題は、押した状態でも試す
      let litPressed = false;
      for (let i = 0; i < 5 && !lit; i++){ L.press(i, true); L.simulate(1000); const d2 = L.simulate(300000); litPressed = litPressed || d2.on.some(x => x > 0); L.press(i, false); }
      check(`全問チェック ${t.id} ${t.title}`, st !== "error" && (lit || litPressed), {st, msgs: msgs()});
    }

    // 個別の動き
    load("k2-3"); L.run(); L.simulate(1000); const off = L.state.latchB; L.press(0, true); L.simulate(1000);
    check("k2-3 押している間だけ点灯", off === 0 && L.state.latchB === 1); L.press(0, false);

    load("k3-3"); L.run(); L.simulate(1000); L.press(0, true); L.simulate(1000);
    check("k3-3 while(1)なし：後から押しても点灯しない", L.state.runState === "ended" && L.state.latchB === 0);
    L.run(); L.simulate(1000); L.press(0, false); L.simulate(1000);
    check("k3-3 while(1)なし：押しながら起動すると点灯したまま", L.state.latchB === 1);

    load("k3-5"); L.run(); L.simulate(4100000);
    check("k3-5 10回点滅して停止", L.state.runState === "halted" && L.state.latchB === 0);
    load("q3-5"); L.run(); L.simulate(9100000);
    check("q3-5 15回点滅して停止（9秒）", L.state.runState === "halted" && L.state.latchB === 0);
    load("q4-6"); L.run(); L.simulate(29900000); const mid = L.state.runState; L.simulate(300000);
    check("q4-6 30秒で消灯して停止", mid === "running" && L.state.runState === "halted" && L.state.latchB === 0);
    load("k4-8"); L.run(); L.simulate(184900000);
    check("k4-8 3分後に全点灯", L.state.latchB === 0b1111); L.simulate(300000);
    check("k4-8 最後は消灯して停止", L.state.runState === "halted" && L.state.latchB === 0);

    load("k5-4"); L.run(); L.simulate(2100000);
    check("k5-4 配列を順に出力", L.state.latchB === 15);
    load("q5-5"); L.run(); L.simulate(1000); const q55 = [L.state.latchB]; L.simulate(400000); q55.push(L.state.latchB); L.simulate(1200000); q55.push(L.state.latchB);
    check("q5-5 8→4→…→8 と回る", q55.join() === "8,4,8", q55);

    load("k6-1"); L.run(); L.simulate(18000050); const a = L.state.latchB; L.simulate(1600000);
    check("k6-1 イルミネーション", a === 0b00110011 && L.state.latchB === 0xFF, [a, L.state.latchB]);
    load("q6-6"); L.run(); L.simulate(1000); const s1 = L.state.latchB; L.simulate(1700000);
    check("q6-6 左から増えて全点灯", s1 === 0x80 && L.state.latchB === 0xFF, [s1, L.state.latchB]);

    load("k6-16"); L.run(); L.simulate(1000); const d16 = duty(100000);
    check("k6-16 緑1・2・4、赤3・4", [8,9,11,14,15].every(i => d16[i] === 50) && [10,12,13].every(i => d16[i] === 0), d16);
    load("q6-3"); L.run(); L.simulate(1000); const d63 = duty(100000);
    check("q6-3 緑RB0・2、赤RB1・3", [8,10,13,15].every(i => d63[i] === 50) && [9,11,12,14].every(i => d63[i] === 0), d63);
    load("m7-1"); L.run(); L.simulate(1000); const d71 = duty(100000);
    check("m7-1 3列目の緑と1列目の赤", d71[10] === 50 && d71[12] === 50 && d71.filter(x => x).length === 2, d71);
    load("m7-2"); L.press(0, true); L.press(2, true); L.run(); L.simulate(1000); const d72 = duty(100000);
    check("m7-2 センサー0の列だけ赤", [8,10,13,15].every(i => d72[i] === 50) && [9,11,12,14].every(i => d72[i] === 0), d72);
    L.press(0, false); L.press(2, false);
    load("q6-5"); L.press(1, true); L.run(); L.simulate(1000); const d65 = duty(100000); L.press(1, false);
    check("q6-5 センサーを赤に、スイッチオフで緑は消灯", d65[13] === 50 && [8,9,10,11,12,14,15].every(i => d65[i] === 0), d65);

    load("m1"); L.run(); L.simulate(1000); const m1off = L.state.latchB; L.press(3, true); L.simulate(1000); const m1a = L.state.latchB; L.simulate(150000); const m1b = L.state.latchB; L.press(3, false);
    check("m1 オフで点灯・オンで点滅", m1off === 0x20 && m1a === 0x20 && m1b === 0, [m1off, m1a, m1b]);
    load("m4"); L.run(); L.simulate(4100000);
    check("m4 5回くり返して全点灯", L.state.runState === "halted" && L.state.latchB === 0xFF);
    load("m5"); L.press(0, true); L.run(); L.simulate(1000000); const m5held = L.state.latchB; L.press(0, false); L.simulate(310000);
    check("m5 押している間は止まる", m5held === 0b10000001 && L.state.latchB === 0b01000010, [m5held, L.state.latchB]);
    load("m6"); L.press(1, true); L.run(); L.simulate(1000); const m6a = L.state.latchB; L.simulate(100000); const m6b = L.state.latchB; L.press(1, false); L.simulate(1000);
    check("m6 上位4ビットは不変のまま反転・消灯", m6a === 0xCF && m6b === 0xC0 && L.state.latchB === 0xC0, [m6a, m6b, L.state.latchB]);

    // よくある間違い
    const has = (o, s) => o.msgs.some(m => m.includes(s));
    check("「;」忘れ", has(runCode("void main(){\n while(1){\n RB0 = 1\n }\n}"), "「;」が足りません"));
    check("if (RA0 = 0) の注意", has(runCode("void main(){ while(1){ if (RA0 = 0) RB0=1; else RB0=0; } }"), "「==」"));
    check("__delay_ms に変数", has(runCode("void main(){ int t=200; while(1){ __delay_ms(t);} }"), "変数は使えません"));
    check("比較の連続", has(runCode("void main(){ int c=500; if (100 <= c < 300) RB0=1; while(1); }"), "&&"));
    check("=< の間違い", has(runCode("void main(){ int c=1; if (c =< 3) RB0=1; while(1); }"), "「<=」"));
    check("0b の付け忘れ", has(runCode("void main(){ PORTB = 00001111; while(1); }"), "0b"));
    check("if の後の ;", has(runCode("void main(){ while(1){ if (RA0 == 0); RB0 = 1; } }"), "if (…) の直後"));
    check("RBO（オー）", has(runCode("void main(){ while(1){ RBO = 1; } }"), "「RBO」が宣言されていません"));
    check("配列の範囲外", has(runCode("void main(){ unsigned char a[]={1,2,3,4}; unsigned char i; for(i=1;i<=4;i++) PORTB=a[i]; while(1); }", 2000), "範囲外"));
    const fl = runCode('void main(){ float n=0, s=0; while(n <= 99){ s = s + n; n = n + 0.3; } PORTB = s == 16285.5; while(1); }', 100000);
    check("float の丸め誤差（スライドと同じ16285.5）", fl.portb === 1);
    return out;
  });
  results.push(...r);
  if (page.__errors.length) check("ページのエラーなし（解答例）", false, page.__errors);
  await page.close();

  /* ---------- 2. URL で問題を開く ---------- */
  for (const [hash, id] of [["q3-6","q3-6"], ["k3-7","k3-7"], ["m4","m4"], ["k3-4","k3-3"], ["q3-4","k3-3"], ["m7","m7-2"]]){
    const p = await openPage(browser, hash);
    const got = await p.evaluate(() => ({sel: document.getElementById("taskSel").value, box: !document.getElementById("taskBox").hidden,
      chips: Array.from(document.querySelectorAll("#taskMeta .chip")).map(c => c.textContent), code: document.getElementById("code").value}));
    check(`#${hash} で ${id} が開く`, got.sel === id && got.box, got);
    if (hash === "q3-6") check("#q3-6 の番号表示", got.chips.join("/") === "第3回/対策サイト 問6", got.chips);
    if (hash === "k3-4") check("#k3-4 は紙と対策の両方を表示", got.chips.join("/") === "第3回/授業資料 紙③④/対策サイト 問4", got.chips);
    await p.close();
  }
  {
    const p = await openPage(browser);
    await p.selectOption("#taskSel", "k5-5");
    check("問題を選ぶと URL が #k5-5 になる", (await p.evaluate(() => location.hash)) === "#k5-5");
    await p.evaluate(() => { location.hash = "m5"; });
    await p.waitForTimeout(100);
    check("URL を #m5 に変えると問題が切り替わる", (await p.evaluate(() => document.getElementById("taskSel").value)) === "m5");
    const link = await p.evaluate(() => { const a = document.getElementById("studyLink"); return a.hidden ? null : a.getAttribute("href"); });
    check("対策サイトへのリンク", link && link.endsWith("#m5"), link);
    await p.close();
  }

  /* ---------- 2b. 問題ごとにコードを覚える ---------- */
  {
    const p = await openPage(browser, "q3-6");
    const typeCode = c => p.evaluate(c => { const e = document.getElementById("code"); e.value = c; e.dispatchEvent(new Event("input")); }, c);
    const code = () => p.evaluate(() => document.getElementById("code").value);
    check("初めての問題は白紙のひな形", (await code()).startsWith("void main(){"));
    await typeCode("// q3-6 のコード");
    await p.selectOption("#taskSel", "m4");
    const m4first = await code();
    await typeCode("// m4 のコード");
    await p.evaluate(() => { location.hash = "q3-6"; }); await p.waitForTimeout(100);
    check("別の問題に切り替えると、その問題のコードになる", !m4first.includes("q3-6") && (await code()) === "// q3-6 のコード", [m4first, await code()]);
    await p.selectOption("#taskSel", "m4");
    check("戻ると前に書いたコードが出てくる", (await code()) === "// m4 のコード");
    await p.reload(); await p.waitForFunction(() => window.__picLab);
    check("ページを開き直してもコードが残る", (await code()) === "// m4 のコード");
    const target = await p.evaluate(() => document.getElementById("studyLink").getAttribute("target"));
    check("対策サイトへのリンクは同じタブを使い回す", target === "kumikomi-study", target);
    await p.close();
  }

  /* ---------- 3. エディタのインデント操作 ---------- */
  {
    const p = await openPage(browser);
    const ed = "#code";
    const setState = (value, s, e) => p.evaluate(([v, s, e]) => { const c = document.getElementById("code"); c.value = v; c.focus(); c.setSelectionRange(s, e === undefined ? s : e); }, [value, s, e]);
    const get = () => p.evaluate(() => { const c = document.getElementById("code"); return {v: c.value, s: c.selectionStart, e: c.selectionEnd}; });
    await p.focus(ed);

    await setState("    ", 4); await p.keyboard.press("Backspace");
    check("Backspace：スペース4個 → 0個", (await get()).v === "");
    await setState("      ", 6); await p.keyboard.press("Backspace");
    check("Backspace：スペース6個 → 4個", (await get()).v === "    ");
    await setState("        x", 8); await p.keyboard.press("Backspace");
    check("Backspace：8個 → 4個（後ろの文字は残る）", (await get()).v === "    x");
    await setState("ab  ", 4); await p.keyboard.press("Backspace");
    check("Backspace：左に文字があれば1文字だけ", (await get()).v === "ab ");
    await setState("    ", 0, 4); await p.keyboard.press("Backspace");
    check("Backspace：選択中はふつうに消える", (await get()).v === "");

    await setState("ab", 2); await p.keyboard.press("Tab");
    check("Tab：次の4の倍数まで（2→4）", (await get()).v === "ab  ");
    await setState("", 0); await p.keyboard.press("Tab");
    check("Tab：0→4", (await get()).v === "    ");

    await setState("        RB0 = 1;", 12); await p.keyboard.press("Shift+Tab");
    let g = await get();
    check("Shift+Tab：1段戻す（カーソルも一緒に）", g.v === "    RB0 = 1;" && g.s === 8, g);
    await setState("  x", 3); await p.keyboard.press("Shift+Tab");
    check("Shift+Tab：4個未満はある分だけ", (await get()).v === "x");

    const block = "a\nb\n\nc";
    await setState(block, 0, block.length); await p.keyboard.press("Tab");
    g = await get();
    check("複数行 Tab：まとめてインデント（空行はそのまま）", g.v === "    a\n    b\n\n    c" && g.s === 0 && g.e === g.v.length, g);
    await p.keyboard.press("Shift+Tab");
    check("複数行 Shift+Tab：まとめて戻す", (await get()).v === block);
    await setState("    a\n    b\nc", 0, 10); await p.keyboard.press("Shift+Tab");
    check("複数行 Shift+Tab：選んだ行だけ", (await get()).v === "a\nb\nc");

    await setState("    if(1){\n        ", 19); await p.keyboard.type("}");
    check("} を打つと1段戻る", (await get()).v === "    if(1){\n    }");
    await setState("x = 1; ", 7); await p.keyboard.type("}");
    check("} は左に文字があればそのまま", (await get()).v === "x = 1; }");

    await setState("void main(){", 12); await p.keyboard.press("Enter");
    check("Enter：{ の後は1段インデント", (await get()).v === "void main(){\n    ");

    await setState("abc\n        ", 12); await p.keyboard.press("Backspace");
    const afterBs = (await get()).v;
    await p.keyboard.press("Control+z");
    check("Ctrl+Z で元に戻せる", afterBs === "abc\n    " && (await get()).v === "abc\n        ", [afterBs, (await get()).v]);
    if (p.__errors.length) check("ページのエラーなし（エディタ）", false, p.__errors);
    await p.close();
  }

  await browser.close();
  let failed = 0;
  for (const t of results){ console.log(`${t.ok ? "OK  " : "NG  "} ${t.name}${t.ok ? "" : "  " + JSON.stringify(t.detail)}`); if (!t.ok) failed++; }
  console.log(`\n${results.length - failed} / ${results.length} 件成功`);
  process.exit(failed ? 1 : 0);
})();
