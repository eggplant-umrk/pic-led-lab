# CLAUDE.md

PIC マイコンの C プログラムを動かす LED シミュレータ（静的サイト）。詳細は README.md。

## 方針
- ビルド工程なし。HTML / CSS / 素の JavaScript だけで書く。
- JS は `<script src>` の通常スクリプトで読み込む（ES モジュールにしない）。`index.html` を `file://` で直接開いても動くようにするため。
- 読み込みは相対パスのみ（GitHub Pages のサブパス `/pic-led-lab/` でも動くように）。
- 外部から読み込むのは Google Fonts だけ。

## 変更したら
- `npm test` を実行して全件 OK を確認する。
- 練習問題を足したら、解答例が問題文どおりに動くことを tests/run-tests.js にも追加する。
- git の commit / push / PR は、docs/GitHub運用ルール.md があればそれに従い、PR テンプレートがあれば使う。
