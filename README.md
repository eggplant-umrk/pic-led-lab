# PIC LEDラボ

授業「組込システム」で書く PIC マイコンの C プログラムを、ブラウザでそのまま動かして LED とスイッチの動きを確かめられるシミュレータ。

- 8連LED（PORTB → LED）と、ダイナミック点灯（緑4・赤4、列 RB0〜RB3・緑の共通線 RB7・赤の共通線 RB6）の2つの回路
- RA0〜RA4 のスイッチ（プルアップ／プルダウンを切り替え可、「押したまま」で固定可）
- `while` / `for` / `do-while` / `if-else` / 配列 / ビット演算 / `__delay_ms` / `printf` に対応
- 授業の問題と模擬中間テストをもとにした練習問題 17 問（解答例付き）
- `if (RA0 = 0)`、`100 <= cnt < 300`、`0b` の付け忘れ、配列の範囲外などのよくある間違いを教えてくれる

ビルドもサーバーも不要。HTML・CSS・JavaScript だけで動く静的サイト。

## ファイル構成

```
index.html          画面の骨組み
css/style.css       見た目
js/tasks.js         練習問題とサンプル（問題を足すときはここ）
js/interpreter.js   C言語サブセットのインタプリタ（字句解析・構文解析・PICの実行）
js/app.js           エディタ・LED・スイッチの画面と、シミュレーションのループ
tests/run-tests.js  自動テスト（Playwright）
.nojekyll           GitHub Pages で公開するときに、ファイルをそのまま配信させるための空ファイル
```

## 手元で動かす

`index.html` をブラウザで開くだけで動く（JS は ES モジュールを使っていないので `file://` でも動く）。

ローカルサーバーで開きたいときは:

```
npm run serve
```

## テスト

```
npm install
npx playwright install chromium
npm test
```

練習問題の解答例が正しく光るか、よくある間違いに注意が出るかを確かめる。

## 公開

### 今の公開先

claude.ai のアーティファクトとして公開している。リポジトリを更新しても自動では反映されないので、反映するときは Claude に依頼する。

### GitHub Pages で公開するとき（あとで）

1. リポジトリを public にする（無料プランの場合）
2. GitHub の Settings → Pages → Build and deployment で、Source を「Deploy from a branch」、Branch を `main` / `/(root)` にして Save
3. 数分で `https://eggplant-umrk.github.io/pic-led-lab/` で見られるようになる

ファイルはすべて相対パスで読み込んでいるので、そのまま動く。

## 練習問題を足す

`js/tasks.js` の `TASKS` に1つ追加する。

```js
{id:"p18", title:"問題のタイトル",
 text:"問題文",
 mode:"row8",                       // "row8" か "dyn"
 sw:["up","up","up","up","up"],     // RA0〜RA4 の回路（"up"=プルアップ, "down"=プルダウン）
 answer:`void main(){ … }`},
```
