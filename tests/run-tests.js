// ブラウザ（Playwright の Chromium）でページを開き、練習問題の解答例と
// よくある間違いの検出を確かめる。実行: npm test
const path = require("path");
const { chromium } = require("playwright");

const PAGE = "file://" + path.resolve(__dirname, "..", "index.html");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__picLab);

  const results = await page.evaluate(() => {
    const L = window.__picLab;
    const sel = document.getElementById("taskSel");
    const msgs = () => Array.from(document.querySelectorAll(".msg")).map(x => x.textContent);
    const load = id => { sel.value = id; sel.dispatchEvent(new Event("change")); document.getElementById("answerBtn").click(); };
    const runCode = (code, us = 200000) => { L.setCode(code); L.run(); L.simulate(us); return {state: L.state.runState, portb: L.state.latchB, msgs: msgs()}; };
    const duty = us => { const d = L.simulate(us); return d.on.map(x => Math.round(x / d.adv * 100)); };
    const r = [];
    const check = (name, ok, detail) => r.push({name, ok: !!ok, detail});

    load("p1"); L.run(); L.simulate(1000);
    const off = L.state.latchB; L.press(0, true); L.simulate(1000);
    check("p1 押している間だけ点灯", off === 0 && L.state.latchB === 1); L.press(0, false);

    load("p3"); L.run(); L.simulate(1000); L.press(0, true); L.simulate(1000);
    check("p3 while(1)なし：後から押しても点灯しない", L.state.runState === "ended" && L.state.latchB === 0);
    L.run(); L.simulate(1000); L.press(0, false); L.simulate(1000);
    check("p3 while(1)なし：押しながら起動すると点灯したまま", L.state.latchB === 1); 

    load("p4"); L.run(); L.simulate(4100000);
    check("p4 10回点滅して停止", L.state.runState === "halted" && L.state.latchB === 0);

    load("p9"); L.run(); L.simulate(2100000);
    check("p9 配列を順に出力", L.state.latchB === 15);

    load("p13"); L.run(); L.simulate(18000050); const a = L.state.latchB; L.simulate(1600000);
    check("p13 イルミネーション", a === 0b00110011 && L.state.latchB === 0xFF, [a, L.state.latchB]);

    load("p15"); L.run(); L.simulate(1000); const d15 = duty(100000);
    check("p15 ダイナミック点灯（緑1・2・4、赤3・4が50%）", [8,9,11,14,15].every(i => d15[i] === 50) && [10,12,13].every(i => d15[i] === 0), d15);

    load("p17"); L.press(0, true); L.press(2, true); L.run(); L.simulate(1000); const d17 = duty(100000);
    check("p17 センサー0の列だけ赤", [8,10,13,15].every(i => d17[i] === 50) && [9,11,12,14].every(i => d17[i] === 0), d17);
    L.press(0, false); L.press(2, false);

    const has = (o, s) => o.msgs.some(m => m.includes(s));
    check("「;」忘れ", has(runCode("void main(){\n while(1){\n RB0 = 1\n }\n}"), "「;」が足りません"));
    check("if (RA0 = 0) の注意", has(runCode("void main(){ while(1){ if (RA0 = 0) RB0=1; else RB0=0; } }"), "「==」"));
    check("__delay_ms に変数", has(runCode("void main(){ int t=200; while(1){ __delay_ms(t);} }"), "変数は使えません"));
    check("比較の連続", has(runCode("void main(){ int c=500; if (100 <= c < 300) RB0=1; while(1); }"), "&&"));
    check("=< の間違い", has(runCode("void main(){ int c=1; if (c =< 3) RB0=1; while(1); }"), "「<=」"));
    check("0b の付け忘れ", has(runCode("void main(){ PORTB = 00001111; while(1); }"), "0b"));
    check("if の後の ;", has(runCode("void main(){ while(1){ if (RA0 == 0); RB0 = 1; } }"), "if (…) の直後"));
    check("配列の範囲外", has(runCode("void main(){ unsigned char a[]={1,2,3,4}; unsigned char i; for(i=1;i<=4;i++) PORTB=a[i]; while(1); }", 2000), "範囲外"));
    const fl = runCode('void main(){ float n=0, s=0; while(n <= 99){ s = s + n; n = n + 0.3; } PORTB = s == 16285.5; while(1); }', 100000);
    check("float の丸め誤差（スライドと同じ16285.5）", fl.portb === 1);
    return r;
  });

  let failed = 0;
  for (const t of results){ console.log(`${t.ok ? "OK  " : "NG  "} ${t.name}${t.ok ? "" : "  " + JSON.stringify(t.detail)}`); if (!t.ok) failed++; }
  if (pageErrors.length){ console.log("ページのエラー:", pageErrors); failed++; }
  console.log(`\n${results.length - failed} / ${results.length} 件成功`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
