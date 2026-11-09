/* 練習問題とサンプル（問題を足すときはここに追加） */
"use strict";
const TASKS = [
 {id:"free", title:"自由に書く", text:"", mode:"row8", sw:["up","up","up","up","up"], answer:null},
 {id:"p1", title:"押している間だけ点灯（プルアップ）",
  text:"RA0 にスイッチ（押すとLow）、RB0 にLED。スイッチを押している間だけ LED が点灯するプログラムを書け。",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p2", title:"押している間だけ点灯（プルダウン）",
  text:"RA2 にスイッチ（押すとHigh）、RB3 にLED。スイッチを押している間だけ LED が点灯するプログラムを書け。",
  mode:"row8", sw:["up","up","down","up","up"],
  answer:`void main(){
    while(1){
        if (RA2 == 1){      // 押すとHigh
            RB3 = 1;
        }
        else {
            RB3 = 0;
        }
    }
}`},
 {id:"p3", title:"while(1) を書き忘れると？",
  text:"「押したら点灯」の if 文だけを書いた（while(1) なし）。\n① 電源を入れてからスイッチを押す\n② RA0 を「押したまま」にしてから電源を入れ、その後「押したまま」を外す\nをそれぞれ試して、どうなるか確かめよう。",
  mode:"row8", sw:["up","up","up","up","up"],
  answer:`void main(){
    if (RA0 == 0){
        RB0 = 1;
    }
    else {
        RB0 = 0;
    }
}`},
 {id:"p4", title:"10回点滅して止まる",
  text:"電源を入れた後、RB0 の LED を 200ms 間隔で 10回 点滅させて止まるプログラムを書け。",
  mode:"row8", sw:["up","up","up","up","up"],
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 10; cnt++){
        RB0 = 1; __delay_ms(200);
        RB0 = 0; __delay_ms(200);
    }
    while(1);       // ここで止める
}`},
 {id:"p5", title:"RB0を20回 → RB1を10回",
  text:"RB0 の LED を 500ms 間隔で 20回 点滅させた後、RB1 の LED を 200ms 間隔で 10回 点滅させて止まるプログラムを書け。（速さ×10 で確かめると早い）",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p6", title:"押している間だけ点滅",
  text:"RA0 にスイッチ（押すとLow）、RB0 に LED。押している間は 100ms 間隔で点滅、押していない間は消灯するプログラムを書け。",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p7", title:"オンとオフで点滅の速さを変える",
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
 {id:"p8", title:"ポート単位で交互点滅",
  text:"RB0〜RB3 の LED で、0b00001010 と 0b00000101 を 300ms ずつ交互に表示するのを 1分間 続け、最後に消灯して止まるプログラムを書け。（速さ×10 推奨）",
  mode:"row8", sw:["up","up","up","up","up"],
  answer:`void main(){
    int cnt;
    for (cnt = 0; cnt < 100; cnt++){    // 60 ÷ 0.6 = 100回
        PORTB = 0b00001010; __delay_ms(300);
        PORTB = 0b00000101; __delay_ms(300);
    }
    PORTB = 0b00000000;
    while(1);
}`},
 {id:"p9", title:"配列を順に出力",
  text:"unsigned char led[] = {0b0001,0b0011,0b0111,0b1111}; を使い、500ms 間隔で led[0]〜led[3] を PORTB に順に出力して止まるプログラムを書け。\n（for の範囲を cnt = 1; cnt <= 4 にすると何が起きるかも試してみよう）",
  mode:"row8", sw:["up","up","up","up","up"],
  answer:`void main(){
    unsigned char led[] = {0b0001, 0b0011, 0b0111, 0b1111};
    unsigned char cnt;
    for (cnt = 0; cnt < 4; cnt++){
        PORTB = led[cnt];
        __delay_ms(500);
    }
    while(1);
}`},
 {id:"p10", title:"配列を while で無限にくり返す",
  text:"前の問題の動きを、for 文を使わずに while 文で無限にくり返すプログラムを書け。",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p11", title:"下位4ビットだけ点灯／消灯",
  text:"RA0 にスイッチ（押すとLow）。上位4ビットの LED は変えずに、押している間は下位4ビットを点灯、離している間は下位4ビットを消灯するプログラムを書け。（最初に上位4ビットを 0b1010 にしておく）",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p12", title:"下位4ビットだけ反転点滅（XOR）",
  text:"RA1 にスイッチ（押すとLow）。押している間は下位4ビットの LED を 100ms ごとに反転、離している間は下位4ビットを消灯（上位4ビットは変えない）。",
  mode:"row8", sw:["up","up","up","up","up"],
  answer:`void main(){
    PORTB = 0b11000000;
    while(1){
        if (RA1 == 0){
            PORTB = PORTB ^ 0b00001111;
            __delay_ms(100);
        }
        else {
            PORTB = PORTB & 0b11110000;
        }
    }
}`},
 {id:"p13", title:"イルミネーション（第6回）",
  text:"0.3秒間隔で 0b01010101 → 0b10101010 → 0b00001111 → 0b11110000 → 0b11001100 → 0b00110011 を10回くり返した後、0.2秒間隔で右から1つずつ点灯を増やして全点灯。これを無限にくり返す。",
  mode:"row8", sw:["up","up","up","up","up"],
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
 {id:"p14", title:"ダイナミック点灯：1つだけ点灯",
  text:"1列目（RB0）の緑だけを点灯させよ。次に PORTB = 0b00000001; に変えると何が起きるか試そう。",
  mode:"dyn", sw:["up","up","up","up","up"],
  answer:`void main(){
    PORTB = 0b01000001;   // RB0=1, RB7=0(緑), RB6=1(赤は光らない)
    while(1);
}`},
 {id:"p15", title:"ダイナミック点灯：緑と赤を同時に",
  text:"緑は 1・2・4列目、赤は 3・4列目を、同時に点灯しているように見せるプログラムを 5ms 間隔のダイナミック点灯で書け。\n速さを ×0.005 にすると、交互に切り替わっている様子が見える。",
  mode:"dyn", sw:["up","up","up","up","up"],
  answer:`void main(){
    while(1){
        PORTB = 0b01001011;   // 緑だけ点灯
        __delay_ms(5);
        PORTB = 0b10001100;   // 赤だけ点灯
        __delay_ms(5);
    }
}`},
 {id:"p16", title:"ダイナミック点灯：センサー＋スイッチ",
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
 {id:"p17", title:"模擬中間：センサーが0の列だけ赤",
  text:"RA0〜RA3 のセンサー値を緑に表示し、センサーが 0 の列だけ赤を点灯させるプログラムを 5ms 間隔のダイナミック点灯で書け。",
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
