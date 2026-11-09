/* 練習問題とサンプル（問題を足すときはここに追加）
 *
 * id     : URL の #〜 で開くときの名前（ASCII 英数字とハイフン）
 * alias  : 同じ問題を別の番号でも開けるようにする名前
 *          k3-7 = 第3回 授業資料 紙⑦、q3-6 = 対策サイト 第3回 問6、m4 = 模擬中間 大問4
 * lec    : 2〜6（第○回）か "mock"（模擬中間テスト）
 * paper  : 授業資料の紙の番号（なければ null）
 * quiz   : 対策サイトの問題番号（なければ null）。模擬中間は "大問4" のように書く
 * study  : 対策サイトで開くときの #〜（なければ null）
 */
"use strict";

const STUDY_URL = "https://claude.ai/artifact/1y16yYWxH41sVwfjQgzJWG";

const SW_UP = ["up","up","up","up","up"];

const TASKS = [
 {id:"free", lec:null, title:"自由に書く", text:"", mode:"row8", sw:SW_UP, answer:null},

 /* ---------------- 第2回 ---------------- */
 {id:"k2-3", lec:2, paper:"③", quiz:null, study:null,
  title:"押している間だけ点灯（プルアップ）",
  text:"RA0 にスイッチ（押すとLow）、RB0 にLED。スイッチを押している間だけ LED が点灯するプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    while(1){
        if (RA0 == 0){      // 押すとLow
            RB0 = 1;
        }
        else {
            RB0 = 0;
        }
    }
}`},
 {id:"k2-5", lec:2, paper:"⑤", quiz:null, study:null,
  title:"オフの間点灯・オンの間消灯",
  text:"RA1 にスイッチ（ここではオンでLow の回路）、RB1 に LED。スイッチオフの間は LED が点灯し、オンの間は消灯するプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    while(1){
        if (RA1 == 1){      // オフ（High）
            RB1 = 1;
        }
        else {              // オン（Low）
            RB1 = 0;
        }
    }
}`},
 {id:"q2-4", lec:2, paper:null, quiz:"4", study:"q2-4",
  title:"押している間だけ点灯（プルダウン）",
  text:"RA2 にプルダウン（押すとHigh）でスイッチ、RB3 にLEDがつながっている。スイッチを押している間だけLEDが点灯するプログラムを書け。",
  mode:"row8", sw:["up","up","down","up","up"],
  answer:`void main(){
    while(1){
        if (RA2 == 1){      // プルダウン：押すとHigh
            RB3 = 1;
        }
        else {
            RB3 = 0;
        }
    }
}`},

 /* ---------------- 第3回 ---------------- */
 {id:"k3-3", alias:["k3-4","q3-4"], lec:3, paper:"③④", quiz:"4", study:"q3-4",
  title:"while(1) を書き忘れると？",
  text:"「押したら点灯」の if 文だけを書いた（while(1) なし）。\n① 電源を入れてからスイッチを押す\n② RA0 を「押したまま」にしてから電源を入れ、その後「押したまま」を外す\nをそれぞれ試して、どうなるか確かめよう。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    if (RA0 == 0){
        RB0 = 1;
    }
    else {
        RB0 = 0;
    }
}`},
 {id:"k3-5", lec:3, paper:"⑤", quiz:null, study:null,
  title:"10回点滅して止まる",
  text:"電源を入れた後、RB0 の LED を 200ms 間隔で 10回 点滅させて止まるプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 10; cnt++){
        RB0 = 1; __delay_ms(200);
        RB0 = 0; __delay_ms(200);
    }
    while(1);       // ここで止める
}`},
 {id:"k3-6", lec:3, paper:"⑥", quiz:null, study:null,
  title:"RB0を20回 → RB1を10回",
  text:"RB0 の LED を 500ms 間隔で 20回 点滅させた後、RB1 の LED を 200ms 間隔で 10回 点滅させて止まるプログラムを書け。（速さ×10 で確かめると早い）",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 20; cnt++){
        RB0 = 1; __delay_ms(500);
        RB0 = 0; __delay_ms(500);
    }
    for (cnt = 0; cnt < 10; cnt++){
        RB1 = 1; __delay_ms(200);
        RB1 = 0; __delay_ms(200);
    }
    while(1);
}`},
 {id:"k3-7", lec:3, paper:"⑦", quiz:null, study:null,
  title:"押している間だけ点滅",
  text:"RA0 にスイッチ（押すとLow）、RB0 に LED。押している間は 100ms 間隔で点滅、押していない間は消灯するプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    while(1){
        if (RA0 == 0){
            RB0 = 1; __delay_ms(100);
            RB0 = 0; __delay_ms(100);
        }
        else {
            RB0 = 0;
        }
    }
}`},
 {id:"k3-8", lec:3, paper:"⑧", quiz:null, study:null,
  title:"オンとオフで点滅の速さを変える",
  text:"RA1 にスイッチ（押すとHigh）、RB1 に LED。スイッチオフの間は 50ms 間隔、オンの間は 100ms 間隔で点滅するプログラムを書け。",
  mode:"row8", sw:["up","down","up","up","up"],
  answer:`void main(){
    while(1){
        if (RA1 == 1){          // オン
            RB1 = 1; __delay_ms(100);
            RB1 = 0; __delay_ms(100);
        }
        else {                  // オフ
            RB1 = 1; __delay_ms(50);
            RB1 = 0; __delay_ms(50);
        }
    }
}`},
 {id:"q3-5", lec:3, paper:null, quiz:"5", study:"q3-5",
  title:"RB2を15回点滅して止まる",
  text:"電源を入れた後、RB2のLEDを 300ms 間隔で 15回 点滅させて止まるプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 15; cnt++){
        RB2 = 1; __delay_ms(300);
        RB2 = 0; __delay_ms(300);
    }
    while(1);
}`},
 {id:"q3-6", lec:3, paper:null, quiz:"6", study:"q3-6",
  title:"押すと50ms点滅・離すと点灯",
  text:"RA0に「押すとLow」のスイッチ、RB0にLED。押している間は 50ms 間隔で点滅、押していない間は点灯し続けるプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    while(1){
        if (RA0 == 0){       // 押している
            RB0 = 1; __delay_ms(50);
            RB0 = 0; __delay_ms(50);
        }
        else {               // 押していない
            RB0 = 1;
        }
    }
}`},

 /* ---------------- 第4回 ---------------- */
 {id:"k4-7", lec:4, paper:"⑦", quiz:null, study:null,
  title:"ポート単位で交互点滅（1分）",
  text:"RB0〜RB3 の LED で、0b00001010 と 0b00000101 を 300ms ずつ交互に表示するのを 1分間 続け、最後に消灯して止まるプログラムを書け。（速さ×10 推奨）",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 100; cnt++){    // 60 ÷ 0.6 = 100回
        PORTB = 0b00001010; __delay_ms(300);
        PORTB = 0b00000101; __delay_ms(300);
    }
    PORTB = 0b00000000;
    while(1);
}`},
 {id:"k4-8", lec:4, paper:"⑧⑨", quiz:null, study:null,
  title:"3分ラーメンタイマー",
  text:"RB0〜RB3 の4つの LED を好きなように点滅させて、3分ラーメンタイマーを作れ。目で見て3分たったことが分かるようにし、点滅のパターンを工夫すること（例：1分ごとに変える）。ポート単位（PORTB = …）で書くこと。\n解答例は第5回のスライドの一例。速さ×10 で確かめよう。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 100; cnt++){    // 1分目：300ms間隔
        PORTB = 0b00001010; __delay_ms(300);
        PORTB = 0b00000101; __delay_ms(300);
    }
    for (cnt = 0; cnt < 150; cnt++){    // 2分目：200ms間隔
        PORTB = 0b00001010; __delay_ms(200);
        PORTB = 0b00000101; __delay_ms(200);
    }
    for (cnt = 0; cnt < 300; cnt++){    // 3分目：100ms間隔
        PORTB = 0b00001010; __delay_ms(100);
        PORTB = 0b00000101; __delay_ms(100);
    }
    PORTB = 0b00001111;                 // 5秒間 全点灯
    __delay_ms(5000);
    PORTB = 0b00000000;
    while(1);
}`},
 {id:"q4-6", lec:4, paper:null, quiz:"6", study:"q4-6",
  title:"交互点滅を30秒続けて消灯",
  text:"RB0〜RB3のLEDで、0b00001100 と 0b00000011 を 250ms ずつ交互に表示するのを 30秒間 続け、最後に全消灯して止まるプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 60; cnt++){     // 30 ÷ 0.5 = 60回
        PORTB = 0b00001100; __delay_ms(250);
        PORTB = 0b00000011; __delay_ms(250);
    }
    PORTB = 0b00000000;
    while(1);
}`},

 /* ---------------- 第5回 ---------------- */
 {id:"k5-4", lec:5, paper:"④", quiz:null, study:null,
  title:"配列を順に出力",
  text:"unsigned char led[] = {0b0001,0b0011,0b0111,0b1111}; を使い、500ms 間隔で led[0]〜led[3] を PORTB に順に出力して止まるプログラムを書け。\n（for の範囲を cnt = 1; cnt <= 4 にすると何が起きるかも試してみよう）",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char led[] = {0b0001, 0b0011, 0b0111, 0b1111};
    unsigned char cnt;
    for (cnt = 0; cnt < 4; cnt++){
        PORTB = led[cnt];
        __delay_ms(500);
    }
    while(1);
}`},
 {id:"k5-5", lec:5, paper:"⑤", quiz:null, study:null,
  title:"配列を while で無限にくり返す",
  text:"前の問題（紙④）の動きを、for 文を使わずに while 文で無限にくり返すプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char led[] = {0b0001, 0b0011, 0b0111, 0b1111};
    unsigned char cnt = 0;
    while(1){
        PORTB = led[cnt];
        __delay_ms(500);
        cnt++;
        if (cnt == 4) cnt = 0;
    }
}`},
 {id:"k5-9", alias:["k5-10"], lec:5, paper:"⑨⑩", quiz:null, study:null,
  title:"下位4ビットだけ点灯／消灯",
  text:"RA0 にスイッチ（押すとLow）。上位4ビットの LED は変えずに、押している間は下位4ビットを点灯、離している間は下位4ビットを消灯するプログラムを書け。（最初に上位4ビットを 0b1010 にしておく）",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char px;
    PORTB = 0b10100000;          // 上位4ビットに何か表示しておく
    while(1){
        px = PORTB;
        if (RA0 == 0){
            PORTB = px | 0b00001111;   // 下位4ビットだけ1
        }
        else {
            PORTB = px & 0b11110000;   // 下位4ビットだけ0
        }
    }
}`},
 {id:"q5-5", lec:5, paper:null, quiz:"5", study:"q5-5",
  title:"配列を400ms間隔で回す",
  text:"unsigned char p[] = {0b1000, 0b0100, 0b0010, 0b0001}; を使い、p[0]→p[1]→p[2]→p[3]→p[0]… と 400ms 間隔で無限にくり返すプログラムを、for文を使わずに書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char p[] = {0b1000, 0b0100, 0b0010, 0b0001};
    unsigned char cnt = 0;
    while(1){
        PORTB = p[cnt];
        __delay_ms(400);
        cnt++;
        if (cnt == 4) cnt = 0;
    }
}`},
 {id:"q5-7", lec:5, paper:null, quiz:"7", study:"q5-7",
  title:"押している間だけ下位4ビットを反転",
  text:"RA0に「押すとLow」のスイッチ、PORTBに8個のLED。押している間は下位4ビットのLEDだけを 200ms ごとに反転させ（上位4ビットは不変）、押していない間は何もしないプログラムを書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    while(1){
        if (RA0 == 0){
            PORTB = PORTB ^ 0b00001111;   // 下位4ビットだけ反転
            __delay_ms(200);
        }
    }
}`},

 /* ---------------- 第6回 ---------------- */
 {id:"k6-1", alias:["k6-2","k6-3","k6-4","k6-5"], lec:6, paper:"①〜⑤", quiz:null, study:null,
  title:"イルミネーション",
  text:"0.3秒間隔で 0b01010101 → 0b10101010 → 0b00001111 → 0b11110000 → 0b11001100 → 0b00110011 を10回くり返した後、0.2秒間隔で右から1つずつ点灯を増やして全点灯。これを無限にくり返す。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char led[] = {0b01010101, 0b00001111, 0b11001100};
    unsigned char cnt, loop;
    while(1){
        for (loop = 0; loop < 10; loop++){
            for (cnt = 0; cnt < 3; cnt++){
                PORTB = led[cnt];  __delay_ms(300);
                PORTB = ~led[cnt]; __delay_ms(300);
            }
        }
        PORTB = 0b00000000;
        for (loop = 0; loop < 8; loop++){
            PORTB = (PORTB << 1) + 1;
            __delay_ms(200);
        }
    }
}`},
 {id:"k6-13", lec:6, paper:"⑬", quiz:null, study:null,
  title:"ダイナミック点灯：1つだけ点灯",
  text:"1列目（RB0）の緑だけを点灯させよ。次に PORTB = 0b00000001; に変えると何が起きるか試そう。",
  mode:"dyn", sw:SW_UP,
  answer:`void main(){
    PORTB = 0b01000001;   // RB0=1, RB7=0(緑), RB6=1(赤は光らない)
    while(1);
}`},
 {id:"k6-16", lec:6, paper:"⑯", quiz:null, study:null,
  title:"ダイナミック点灯：緑と赤を同時に",
  text:"緑は 1・2・4列目、赤は 3・4列目を、同時に点灯しているように見せるプログラムを 5ms 間隔のダイナミック点灯で書け。\n速さを ×0.005 にすると、交互に切り替わっている様子が見える。",
  mode:"dyn", sw:SW_UP,
  answer:`void main(){
    while(1){
        PORTB = 0b01001011;   // 緑だけ点灯
        __delay_ms(5);
        PORTB = 0b10001100;   // 赤だけ点灯
        __delay_ms(5);
    }
}`},
 {id:"k6-17", lec:6, paper:"⑰", quiz:null, study:null,
  title:"ダイナミック点灯：センサー＋スイッチ",
  text:"RA0〜RA3 のセンサー値を上側の緑4個に表示し、RA4 のスイッチ（オンでLow）がオンなら下側の赤4個を全点灯、オフなら全消灯。5ms 間隔のダイナミック点灯で書け。\n（RA0〜RA3 の「押したまま」をセンサー値として使う）",
  mode:"dyn", sw:["down","down","down","down","up"],
  answer:`void main(){
    while(1){
        PORTB = (PORTA & 0b00001111) + 0b01000000;
        __delay_ms(5);
        if (RA4 == 0){
            PORTB = 0b10001111;
        }
        else {
            PORTB = 0b10000000;
        }
        __delay_ms(5);
    }
}`},
 {id:"q6-3", lec:6, paper:null, quiz:"3", study:"q6-3",
  title:"緑RB0・RB2、赤RB1・RB3を同時に",
  text:"緑は1・3列目（RB0・RB2）、赤は2・4列目（RB1・RB3）を同時に光って見せるプログラムを、5ms間隔のダイナミック点灯で書け。",
  mode:"dyn", sw:SW_UP,
  answer:`void main(){
    while(1){
        PORTB = 0b01000101;  __delay_ms(5);   // 緑：RB0・RB2
        PORTB = 0b10001010;  __delay_ms(5);   // 赤：RB1・RB3
    }
}`},
 {id:"q6-5", lec:6, paper:null, quiz:"5", study:"q6-5",
  title:"センサーを赤に、スイッチで緑",
  text:"PORTAの下位4ビット（RA0〜RA3）にセンサーがある。センサーの値を赤4個に表示し、RA4のスイッチ（オンでLow）がオンなら緑4個を全点灯、オフなら全消灯するプログラムを、5ms間隔のダイナミック点灯で書け。\n（RA0〜RA3 の「押したまま」をセンサー値として使う）",
  mode:"dyn", sw:["down","down","down","down","up"],
  answer:`void main(){
    while(1){
        PORTB = (PORTA & 0b00001111) + 0b10000000;  // 赤：RB7=1, RB6=0
        __delay_ms(5);
        if (RA4 == 0){
            PORTB = 0b01001111;     // 緑4つ点灯：RB7=0, RB6=1
        }
        else {
            PORTB = 0b01000000;     // 緑消灯
        }
        __delay_ms(5);
    }
}`},
 {id:"q6-6", lec:6, paper:null, quiz:"6", study:"q6-6",
  title:"左から1つずつ点灯が増える",
  text:"8個のLEDを一列に並べてPORTBにつないだ。全消灯から始めて、左（RB7）から1つずつ点灯が増え、8回で全点灯になるようにせよ（200ms間隔）。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char loop;
    PORTB = 0b00000000;
    for (loop = 0; loop < 8; loop++){
        PORTB = (PORTB >> 1) + 0b10000000;   // 右にずらして左端に1
        __delay_ms(200);
    }
    while(1);
}`},

 /* ---------------- 模擬中間テスト ---------------- */
 {id:"m1", lec:"mock", paper:null, quiz:"大問1(3)", study:"m1",
  title:"オンで150ms点滅・オフで点灯",
  text:"RA3 にスイッチ、RB5 にLED。スイッチは「オンでHigh」になる回路とする。スイッチがオンの間は LED が 150ms 間隔で点滅し、オフの間は点灯し続けるプログラムを書け。",
  mode:"row8", sw:["up","up","up","down","up"],
  answer:`void main(){
    while(1){
        if (RA3 == 1){                  // オン（High）
            RB5 = 1; __delay_ms(150);
            RB5 = 0; __delay_ms(150);
        }
        else {                          // オフ
            RB5 = 1;
        }
    }
}`},
 {id:"m4", lec:"mock", paper:null, quiz:"大問4", study:"m4",
  title:"配列を5回くり返して全点灯",
  text:"PORTBに8個のLEDがある。配列 {0b10000001, 0b01000010, 0b00100100, 0b00011000} を使い、電源オン後、この4パターンを 200ms 間隔で順に表示するのを 5回 くり返した後、全点灯して止まるプログラムを書け。変数は unsigned char 型とし、配列の初期化もプログラム内に書くこと。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char led[] = {0b10000001, 0b01000010, 0b00100100, 0b00011000};
    unsigned char cnt, loop;
    for (loop = 0; loop < 5; loop++){
        for (cnt = 0; cnt < 4; cnt++){
            PORTB = led[cnt];
            __delay_ms(200);
        }
    }
    PORTB = 0b11111111;
    while(1);
}`},
 {id:"m5", lec:"mock", paper:null, quiz:"大問5", study:"m5",
  title:"押している間は表示を止める",
  text:"大問4と同じ配列を 300ms 間隔で led[0]→led[3]→led[0]… と無限にくり返す。ただし RA0 のスイッチ（オンでLow）を押している間は、表示を進めずに今のパターンのまま止める。for文は使わずに書け。",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    unsigned char led[] = {0b10000001, 0b01000010, 0b00100100, 0b00011000};
    unsigned char cnt = 0;
    while(1){
        PORTB = led[cnt];
        __delay_ms(300);
        if (RA0 == 1){              // 押していないときだけ進める
            cnt++;
            if (cnt == 4) cnt = 0;
        }
    }
}`},
 {id:"m6", lec:"mock", paper:null, quiz:"大問6", study:"m6",
  title:"下位4ビットだけ反転点滅（XOR）",
  text:"PORTBの8個のLEDのうち、上位4ビットは別の用途で使っているので変えてはいけない。RA1のスイッチ（オンでLow）がオンの間は下位4ビットのLEDを 100ms ごとに反転させて点滅させ、オフの間は下位4ビットを消灯するプログラムを書け。（上位4ビットが変わらないことが分かるように、最初に 0b11000000 を出しておく）",
  mode:"row8", sw:SW_UP,
  answer:`void main(){
    PORTB = 0b11000000;
    while(1){
        if (RA1 == 0){
            PORTB = PORTB ^ 0b00001111;   // 下位4ビットだけ反転（1とXOR）
            __delay_ms(100);
        }
        else {
            PORTB = PORTB & 0b11110000;   // 下位4ビットだけ0（0とAND）
        }
    }
}`},
 {id:"m7-1", lec:"mock", paper:null, quiz:"大問7(1)", study:"m7",
  title:"3列目の緑と1列目の赤を同時に",
  text:"3列目の緑と1列目の赤を、同時に点灯しているように見せたい。5ms 間隔のダイナミック点灯で書け。",
  mode:"dyn", sw:SW_UP,
  answer:`void main(){
    while(1){
        PORTB = 0b01000100;  __delay_ms(5);   // 緑：RB2
        PORTB = 0b10000001;  __delay_ms(5);   // 赤：RB0
    }
}`},
 {id:"m7-2", alias:["m7"], lec:"mock", paper:null, quiz:"大問7(2)", study:"m7",
  title:"センサーが0の列だけ赤",
  text:"RA0〜RA3 のセンサー値を緑に表示し、センサーが 0 の列だけ赤を点灯させるプログラムを 5ms 間隔のダイナミック点灯で書け。\n（RA0〜RA3 の「押したまま」をセンサー値として使う）",
  mode:"dyn", sw:["down","down","down","down","up"],
  answer:`void main(){
    while(1){
        PORTB = (PORTA & 0b00001111) + 0b01000000;   // 緑：1の列
        __delay_ms(5);
        PORTB = (~PORTA & 0b00001111) + 0b10000000;  // 赤：0の列
        __delay_ms(5);
    }
}`},
];

const STARTER = `void main(){

}`;
const DEFAULT_CODE = TASKS[1].answer;

/* 番号の表示 */
function lecName(lec){ return lec === "mock" ? "模擬中間" : `第${lec}回`; }
function taskTag(t){
  const parts = [];
  if (t.paper) parts.push("紙" + t.paper);
  if (t.quiz) parts.push(t.lec === "mock" ? t.quiz : "問" + t.quiz);
  return parts.join("｜");
}
/* #〜 の名前から問題を探す（id か alias） */
function findTask(name){
  if (!name) return null;
  return TASKS.find(t => t.id === name || (t.alias && t.alias.includes(name))) || null;
}
