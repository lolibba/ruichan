enchant();
// enchant.jsが入力を無効にするキーを制御できる環境変数(デフォルト:[37, 38, 39, 40, 32])
//enchant.ENV.PREVENT_DEFAULT_KEY_CODES = [];

// 定数
var W = 320; // ゲーム最大幅
var H = 320; // ゲーム最大高さ
var FPS = 24; // 1秒あたりのフレーム数
var IMG_DIR = "./img/";
var UA   = window.navigator.userAgent;
var isIe = UA.toLowerCase().indexOf("msie") != -1 || UA.toLowerCase().indexOf("trident/") != -1; // IE か
var game_ = null;
var stage = 0;
var lv    = 1; // レベル
var hpMax = 0; // ヒットポイント
var pow   = 0; // 
var atk   = 0; // 
var exp   = 0; // 経験値
var expNext = 0; // 経験値
var expRest = 0; // 経験値
var evo   = [0,0,0,0]; // 進化素材

window.onload = function() {
    //saveData("exp", 0);

    game_ = new Core(W, H); // 表示領域の大きさを設定
    game_.fps = FPS;        // ゲームの進行スピードを設定
    game_.preload( // ゲームに使う素材を予め読み込み
	img('bg.png'), img('start.png'), img('title_logo.png'),
	img('bg00.png'), img('bg01.png'), img('bg02.png'), img('bg03.png'), 
	img('bg04.png'), img('bg05.png'), img('bg06.png'), 
	img('mura.png'), img('face.png'), img('serif.png'), img('blood.png'), 
	img('player1.png'), img('status.png'), img('item.png'),
	img('enemy.png'),
	img('boss0.png'), img('boss1.png'), img('boss2.png'), img('boss3.png'),
	img('guage.png'), img('guagebar.png'), img('boss_encount.png'), img('weak.png'),
	img('map.png'), img('stageclearbg.png'), img('gameoverbg.png')
    );

    game_.onload = function() { // ゲームの準備が整ったらメインの処理を実行

        //-----------------------------
        // ゲームシーン
        //-----------------------------
        var createGameScene = function() {
            var s = new Scene();                   // 新しいシーンをつくる
            s.backgroundColor = '#000';         // シーンの背景色を設定

            var GROUND_LINE = GL = 240;   // 地平線の高さ(固定)
            var DAMAGE_TIME = 24;  // ダメージを受けてから復帰までのフレーム数

            // 最大速度の設定
            var setSpeedMax = function(pow) {
                speedMax = 7 + pow*1;
                return speedMax;
            }

            if(stage > 6) stage = rand(7); // ステージランダム
            //stage = 1; // ステージ
            var BD = // BossData
            [{w:194, h:198, i:'boss0.png', t:0, s:2.0, f:0, fm:1, a:128, p:0, hp:800, exp:8000}
            ,{w:120, h:207, i:'boss1.png', t:0, s:6.0, f:0, fm:1, a:128, p:1, hp:1200, exp:12000}
            ,{w:120, h:207, i:'boss2.png', t:0, s:7.0, f:0, fm:1, a:192, p:1, hp:1600, exp:16000}
            ,{w:194, h:198, i:'boss0.png', t:0, s:2.0, f:0, fm:1, a:128, p:0, hp:800, exp:8000}
            ,{w:120, h:207, i:'boss1.png', t:0, s:6.0, f:0, fm:1, a:128, p:1, hp:1200, exp:12000}
            ,{w:120, h:207, i:'boss2.png', t:0, s:7.0, f:0, fm:1, a:192, p:1, hp:1600, exp:16000}
            ,{w:176, h:185, i:'boss3.png', t:0, s:6.0, f:0, fm:1, a:128, p:2, hp:1200, exp:24000}
            ];
            var bd = BD[stage];
            var bDir     = false; // 方向
            var bHpMax   = bd.hp; // ヒットポイント
            var bHp      = bHpMax; // ヒットポイント
            var bDamage  = 0;
            var bRecovery= 0;
            var isBossSetted = false;

            var scroll   = 0; // スクロール量を記録する変数
            var speedMax = setSpeedMax(pow); // スクロールの速さ(現在の最大値)
            var speed    = 1; // 現在のスピードを記録する変数
            var jump     = 0; // 着地してからのジャンプ回数を記録する変数
            var dir      = true; // 方向
            var hp       = hpMax; // ヒットポイント
            var damage   = 0;
            var recovery = 0;
            var lastMoveY = 0; // 多段ジャンプからの着地まで継続させる移動距離に利用する
            var lastPositionY = 0;
            var nextJumpPeriod = 2;  // 次のジャンプ可能タイミングを1フレームずらす
            var bossPhase = 0;
            var gameOver  = false;
            var stageClear= false;
            var isStop    = false;
            var isStopFlg = false;

            // 画像とラベルを配置（重ねる順）
            var bg1    = addSprite(s, W, H, 0, 0, 'bg'+(stage<9?'0':'')+stage+'.png'); // スクロールする背景1
            var bg2    = addSprite(s, W, H, W, 0, 'bg'+(stage<9?'0':'')+stage+'.png'); // スクロールする背景2
            var status = addSprite(s, 310, 60, 5, H-60, 'status.png');
            var boss  = [];
            var weak  = [];
            var dang  = [];
            var enemy = [];
            var item  = [];
            var evoLbl= [];
            boss[stage]  = addSprite(s, bd.w, bd.h, H-bd.w, -bd.h, bd.i);
            weak[0]  = addSprite(s, 54, 54, W, H, 'weak.png', 0);
            weak[1]  = addSprite(s, 54, 54, W, H, 'weak.png', 1);
            dang[0]  = addSprite(s, 54, 54, W, H, 'weak.png', 2);
            dang[1]  = addSprite(s, 54, 54, W, H, 'weak.png', 3);
            enemy[0] = addSprite(s, 32, 35, -32, GL-35, 'enemy.png');
            enemy[1] = addSprite(s, 32, 35, -32, GL-35, 'enemy.png');
            enemy[2] = addSprite(s, 32, 35, -32, GL-35, 'enemy.png');
            enemy[3] = addSprite(s, 32, 35, -32, 120, 'enemy.png');
            enemy[4] = addSprite(s, 32, 35, -32, GL-35, 'enemy.png');
            enemy[5] = addSprite(s, 32, 35, -32, 80, 'enemy.png');
            item[0]  = addSprite(s, 35, 35, -35, GL-35, 'item.png');
            item[4]  = addSprite(s, 35, 35, -35, GL-35, 'item.png');
            item[5]  = addSprite(s, 35, 35, -35, GL-35, 'item.png');
            evoLbl[0] = addLabel(s, 20, null,  28, H-58, evo[0].toString(), '#FFF');
            evoLbl[1] = addLabel(s, 20, null,  67, H-58, evo[1].toString(), '#FFF');
            evoLbl[2] = addLabel(s, 20, null, 106, H-58, evo[2].toString(), '#FFF');
            evoLbl[3] = addLabel(s, 20, null, 145, H-58, evo[3].toString(), '#FFF');
            var guage = addSprite(s, W, 14, 0, GL+5, 'guage.png');
            var bar   = addSprite(s, 293, 10, (W-293)/2-1, GL+7, 'guagebar.png');
            var score  = addLabel(s, W, null, W/2+20, H-25, '', '#FFF'); // スコア表示
            var jpLbl  = addLabel(s, W, null, 0, 20, '', '#FFF'); // jp表示
            var dieLbl = addLabel(s, W, null, 160, 80, '', '#000'); // 捨て台詞表示
            var dieLbl2= addLabel(s, W, null, 159, 79, '', '#FFF'); // 捨て台詞表示
            // 自機用スプライトと当たり判定用スプライトの設定
            var player = addSprite(s, 94, 94, 80, GROUND_LINE - 94, 'player1.png');
            var playerHit = addSprite(s, 1, 32, 0, 0, null); // x,y はゲーム中に追従させる

            var hpLbl  = addLabel(s, W, null, W/2+20, H-50, 'HP: ' + hp.toString() + ' / ' + hpMax.toString(), '#FFF'); // HP表示
            var dmgLbl = addLabel(s, W, null, W, 0, '', '#F33', '23px X', 'center'); // dmg表示
            var bHpLbl  = addLabel(s, W, null, 0, 0, '', '#FFF', null, 'right'); // HP表示
            var bDmgLbl = addLabel(s, W, null, W, 0, '', '#F33', '23px X', 'center'); // dmg表示
            var weakLbl = addLabel(s, 100, null, W, 0, 'Weak', '#33F', '23px X', 'right');
            var dangLbl = addLabel(s, 100, null, W, 0, 'Danger', '#F33', '23px X', 'right');

            guage.visible = false;
            bar.visible = false;

            // 自機がやられた関数（ゲームオーバー）
            var playerDead = function() {
                if(gameOver) return; // 2重の発生を防ぐ
                gameOver = true;
                isStop = true;
                hp = 0;
                boss[stage].tl.clear();
                player.tl.clear();
                s.tl.delay(72).then(function(){ // やられ絵になるまで最低2フレームくらい必要？
                    game_.pushScene(createGameoverScene(scroll)); // シーンを重ねる(push)
                });
            }

            // 自機がやられた関数（ダメージ）※マイナス値の場合は回復
            var playerDmg = function(dmg) {
                if(dmg == 0) return;
                if(dmg > 0){
                    if(damage > 0) return;
                    hp -= dmg;
                    dmgLbl.color = '#F33';
                    speed = 1;
                    (hp <= 0) ? playerDead() : damage = DAMAGE_TIME;
                    if(pow > 0){
                        pow--; player.frame -= 4;
                        setSpeedMax(pow);
                    }
                }else{
                    if(hp >= hpMax) return;
                    hp -= dmg;
                    dmgLbl.color = '#3F3';
                    dmg *= -1;
                    if(hp >= hpMax) hp = hpMax;
                    recovery = DAMAGE_TIME;
                }
                hpLbl.text = 'HP: ' + hp.toString() + ' / ' + hpMax.toString(); // HP更新
                dmgLbl.text = dmg.toString(); // ダメージ表示
                // ダメージ表示用ラベルを自機の上に置く
                dmgLbl.x = player.x + player.width /2 - dmgLbl.width /2;
                dmgLbl.y = player.y - (pow!=2?0:24);
            }

            // ボスがやられた関数（ステージクリア）
            var bossDead = function() {
                if(stageClear) return; // 2重の発生を防ぐ
                stageClear = true;
                isStop = true;
                bHp = 0;
                flash();
                boss[stage].tl.clear();
                player.tl.clear();
                s.tl.delay(72).then(function(){ // やられ絵になるまで最低2フレームくらい必要？
                    game_.pushScene(createStageclearScene(scroll, bd.exp)); // シーンを重ねる(push)
                });
            }

            // ボスがやられた関数（ダメージ）※マイナス値の場合は回復
            var bossDmg = function(dmg) {
                if(dmg == 0) return;
                if(dmg > 0){
                    if(bDamage > 0) return;
                    bHp -= dmg;
                    bDmgLbl.color = '#F33';
                    (bHp <= 0) ? bossDead() : bDamage = DAMAGE_TIME;
                }else{
                    if(bHp >= bHpMax) return;
                    bHp -= dmg;
                    bDmgLbl.color = '#3F3';
                    dmg *= -1;
                    if(bHp >= bHpMax) bHp = bHpMax;
                    bRecovery = DAMAGE_TIME;
                }
                //bHpLbl.text = 'BossHP: '+ bHp.toString() +' / '+ bHpMax.toString();//HP更新
                //bDmgLbl.text = dmg.toString(); // ダメージ表示
                bar.width = Math.ceil(293 * bHp / bHpMax);
                // ダメージ表示用ラベルをボスの上に置く
                bDmgLbl.x = boss[stage].x + boss[stage].width /2 - bDmgLbl.width /2;
                bDmgLbl.y = boss[stage].y - 24;
            }

            // ボスの動きの関数
            var bossAct = function(e, timing, spd, frame, frameMax, dmg, pat){
                var w = e.width;
                var h = e.height;

                if(!isBossSetted){ // 初回のみ tl でのパターンをセットする
                    isBossSetted = true;
                    switch(pat){
                    case 0:
                        break;
                    case 1:
                        e.tl.clear();
                        e.tl
                        .moveBy(0, -120, 12, enchant.Easing.CUBIC_EASEOUT)
                        .moveBy(0, 120, 12, enchant.Easing.CUBIC_EASEIN)
                        .then(function(){
                            e.y = GL-h;
                            earthquake();
                        })
                        .delay(32)
                        .loop();
                        break;
                    case 2:
                        e.tl.clear();
                        e.tl
                        .moveBy(0, -240, 32, enchant.Easing.CUBIC_EASEOUT)
                        .moveBy(0, 240, 32, enchant.Easing.CUBIC_EASEIN)
                        .then(function(){
                            e.y = GL-h;
                            earthquake();
                        })
                        .delay(2)
                        .loop();
                        break;
                    default: break;
                    }
                }
                switch(pat){
                case 0: // 後ずさりしているのでプレーヤーと同じ向き
                    e.x += (bDir == 0 ? spd : spd * -1);
                    if(e.x > W -w +32){
                        e.x = W -w;
                        bDir = 1;
                        e.scale(-1, 1);
                    }else if(e.x < -32){
                        e.x = 0;
                        bDir = 0;
                        e.scale(-1, 1);
                    }
                    break;
                case 1: // ボスの向きはプレイヤーと逆になる
                case 2: // ボスの向きはプレイヤーと逆になる
                    if(e.y != GL-h) e.x += (bDir == 0 ? spd * -1 : spd);
                    if(e.x > W -w +32){
                        e.x = W -w;
                        bDir = 0;
                        e.scale(-1, 1);
                    }else if(e.x < -32){
                        e.x = 0;
                        bDir = 1;
                        e.scale(-1, 1);
                    }
                    break;
                default: break;
                }

                // スクロールと自機との接触の設定

                // フレームアニメーション
                e.frame = (e.frame >= frameMax - 1) ? frame : e.frame + 1;
                // 衝突判定をし、受けたダメージを返す
                weak[0].x = e.x + w /2 - weak[0].width /2;
                weak[0].y = e.y;
                dang[0].x = e.x + w /2 - dang[0].width /2;
                dang[0].y = e.y + h - dang[0].height;
                //if(e.intersect(playerHit)) { playerDmg(dmg + (rand(30)-15)); }
                if(weak[0].intersect(playerHit)) {
                    if(bDamage <= 0){ dir = !dir; player.scale(-1, 1); jump--; }
                    bossDmg(atk + (rand(30)-15));
                }
                if(dang[0].intersect(playerHit)) {
                    if(damage <= 0){ dir = !dir; player.scale(-1, 1); jump--; }
                    playerDmg(dmg + (rand(30)-15));
                }
                if(bDamage > 0 || bRecovery > 0){
                    bDamage--; bRecovery--;
                    if(bDamage > 0){
                        e.opacity -= 0.4;
                        if(e.opacity <= 0) e.opacity = 1;
                    }
                    if(bDamage <= 0 && bRecovery <= 0){
                        e.opacity = 1;
                        bDmgLbl.text = '';
                    }else{
                        // ダメージ表示用ラベルを自機の上に置く
                        bDmgLbl.x = e.x + w /2 - bDmgLbl.width /2;
                        bDmgLbl.y = e.y - 24;
                    }
                }
            }

            // 障害物の動きの関数
            var enemyAct = function(e, timing, spd, frame, frameMax, dmg, pat){
                var h = e.height;

                // 障害物の出現タイミング：数字1を数字2で割った余りが0になった時
                //if(scroll % timing === 0) {
                // スピード変動すると割り切れなくなるので仕方ないので画面外でも動かす
                if(e.x < -timing) {
                    e.visible = bossPhase == 0;
                    e.frame = frame;
                    e.x = W; // 指定m走るごとに右端に移動(出現)
                    var y = e.y; // 
                    switch(pat){
                    case 0:
                        e.tl.clear();
                        e.tl
                        .moveBy(0, -120, 12, enchant.Easing.CUBIC_EASEOUT)
                        .moveBy(0, 120, 12, enchant.Easing.CUBIC_EASEIN);
                        break;
                    case 1:
                        e.y =  -h;
                        e.tl.clear();
                        e.tl
                        .moveBy(0, GL, 32, enchant.Easing.NO_EASING);
                        break;
                    case 2:
                        e.y =  GL-h;
                        e.tl.clear();
                        e.tl
                        .moveBy(0, -60, 6, enchant.Easing.CUBIC_EASEOUT)
                        .moveBy(0, 60, 6, enchant.Easing.CUBIC_EASEIN).loop();
                        break;
                    case 3:
                        e.tl.clear();
                        e.tl
                        .moveBy(0, -24, 24, enchant.Easing.BOUNCE_EASEIN)
                        .moveBy(0, 24, 24, enchant.Easing.BOUNCE_EASEOUT);
                        break;
                    default: break;
                    }
                }

                e.x -= speed * spd;   // 障害物をスクロール

                // 障害物のスクロールと自機との接触の設定
                if(e.x > -e.width && e.visible) { // 障害物が出現している(画面内にある)とき
                    //e.x -= speed * spd;   // 障害物をスクロール

                    switch(pat){
                    case 4:
                        e.rotate(-24);
                        break;
                    default: break;
                    }

                    // フレームアニメーション
                    e.frame = (e.frame >= frameMax - 1) ? frame : e.frame + 1;
                    // 衝突判定をし、受けたダメージを返す
                    if(e.intersect(playerHit)) { playerDmg(dmg + (rand(30)-15)); }
                }else{
                    e.rotation = 0;
                }
            }

            // アイテムの動きの関数
            var itemAct = function(e, timing, spd, frame, frameMax, dmg, pat){
                var h = e.height;

                if(e.x < -timing) {
                    e.frame = frame;
                    e.x = W; // 指定m走るごとに右端に移動(出現)
                    e.y = rand(GL-h); // 
                    switch(frame){
                    case 0:
                        e.frame = rand(4);
                        break;
                    case 4:
                        break;
                    case 5:
                        if(rand(2) == 0) e.x = -e.x;
                        break;
                    default: break;
                    }
                }

                e.x -= speed * spd;   // 障害物をスクロール

                // アイテムのスクロールと自機との接触の設定
                if(e.x > -e.width) { // 障害物が出現している(画面内にある)とき
                    if(e.intersect(playerHit)) {
                        switch(frame){
                        case 4: playerDmg(dmg); break;
                        case 5: playerDmg(dmg); break;
                        default:
                           evo[e.frame]++; if(evo[e.frame] >= 9) evo[e.frame] = 9;
                           if(pow < 1){
                               if(evo[0]>0&&evo[1]>0&&evo[2]>0){
                                   pow++; player.frame += 4;
                                   evo[0]--; evo[1]--; evo[2]--;
                                   setSpeedMax(pow);
                               }
                           }else if(pow < 2){
                               if(evo[0]>0&&evo[1]>0&&evo[2]>0&&evo[3]>0){
                                   pow++; player.frame += 4;
                                   evo[0]--; evo[1]--; evo[2]--; evo[3]--;
                                   setSpeedMax(pow);
                               }
                           }
                           for(var i=0; i<evoLbl.length; i++){
                               evoLbl[i].text = evo[i].toString();
                           }
                           break;
                        }
                        e.x = -e.x;
                    }
                }
            }

            // ボスエンカウント
            var bossEncountStart = function(){
                var bossEncount = addSprite(s, W, 242, 0, 0, 'boss_encount.png');
                bossEncount.visible = false;
                bossEncount.tl
                .fadeOut(64) // 雑魚に被らないように時間調整
                .then(function(){
                    bossEncount.visible = true;
                    if(jump > 0){
                        isStopFlg = true; // ジャンプが終わったら下げる
                    }else{
                        isStop = true;
                        player.tl
                        .moveBy(-80, 0, 12, enchant.Easing.NO_EASING);
                    }
                })
                .fadeIn(FPS/2)
                .delay(64)
                .fadeOut(8)
                .and()
                .scaleTo(3.5, 3.5, 8)
                .delay(8)
                .then(function(){
                    //bHpLbl.text = 'BossHP: '+ bHp.toString() +' / '+ bHpMax.toString();//HP表示
                    var e = boss[stage];
                    e.visible = true;
                    e.tl
                    .moveTo(e.x, GL-e.height, 12, enchant.Easing.CUBIC_EASEIN)
                    .then(function(){
                        earthquake();
                        guage.visible = true;
                        bar.visible = true;
                        weak[0].x = e.x + e.width /2 - weak[0].width /2;
                        weak[0].y = e.y;
                        weak[1].x = weak[0].x;
                        weak[1].y = weak[0].y;
                        weakLbl.x = weak[0].x - weakLbl.width;
                        weakLbl.y = weak[0].y;
                        dang[0].x = e.x + e.width /2 - dang[0].width /2;
                        dang[0].y = e.y + e.height - dang[0].height;
                        dang[1].x = dang[0].x;
                        dang[1].y = dang[0].y;
                        dangLbl.x = dang[0].x - dangLbl.width;
                        dangLbl.y = dang[0].y;
                        weak[0].tl.rotateBy( 3600, 360).loop();
                        weak[1].tl.rotateBy(-3600, 360).loop();
                        dang[0].tl.rotateBy( 3600, 360).loop();
                        dang[1].tl.rotateBy(-3600, 360).loop();
                    })
                    .delay(72)
                    .then(function(){
                        weak[0].tl.clear(); weak[0].visible = false;
                        weak[1].tl.clear(); weak[1].visible = false;
                        dang[0].tl.clear(); dang[0].visible = false;
                        dang[1].tl.clear(); dang[1].visible = false;
                        weakLbl.tl.removeFromScene();
                        dangLbl.tl.removeFromScene();
                        isStop = false;
                        bossPhase = 2;
                    });
                })
                .removeFromScene();
            }
            // エフェクト
            var earthquake = function(){
                bg1.tl
                .moveTo(bg1.x, 32, 2)
                .moveTo(bg1.x,  0, 2)
                .moveTo(bg1.x,-16, 2)
                .moveTo(bg1.x,  0, 2)
                .moveTo(bg1.x,  8, 2)
                .moveTo(bg1.x,  0, 2)
                .moveTo(bg1.x, -4, 2)
                .moveTo(bg1.x,  0, 2);
                bg2.tl
                .moveTo(bg2.x, 32, 2)
                .moveTo(bg2.x,  0, 2)
                .moveTo(bg2.x,-16, 2)
                .moveTo(bg2.x,  0, 2)
                .moveTo(bg2.x,  8, 2)
                .moveTo(bg2.x,  0, 2)
                .moveTo(bg2.x, -4, 2)
                .moveTo(bg2.x,  0, 2);
            }
            var flash = function(){
                s.backgroundColor = '#FFF';         // シーンの背景色を設定
                bg1.tl
                .fadeOut(0)
                .fadeIn(8)
                .fadeOut(1)
                .fadeIn(FPS);
                bg2.tl
                .fadeOut(0)
                .fadeIn(8)
                .fadeOut(1)
                .fadeIn(FPS)
                .then(function(){
                    s.backgroundColor = '#000';         // シーンの背景色を設定
                });
            }
            //----------------------------------------------
            // ENTER_FRAME: 毎フレームイベントをシーンに追加
            //----------------------------------------------
            s.addEventListener(Event.ENTER_FRAME, function(){
                if(isStop) {
                    if(gameOver) {
                        player.frame = 3 +(pow*4); // 自機を涙目にする
                        dieLbl.text = 'ヤラレチャッタ'; dieLbl2.text = dieLbl.text;
                        dieLbl.y    = player.y + 10;    dieLbl2.y    = dieLbl.y -1;
                    }
                    return;
                }else if(damage > 0 || recovery > 0){
                    damage--; recovery--;
                    if(damage > 0){
                        player.opacity -= 0.4;
                        if(player.opacity <= 0) player.opacity = 1;
                    }
                    if(damage <= 0 && recovery <= 0){
                        player.opacity = 1;
                        dmgLbl.text = '';
                    }else{
                        // ダメージ表示用ラベルを自機の上に置く
                        dmgLbl.x = player.x + player.width /2 - dmgLbl.width /2;
                        dmgLbl.y = player.y - (pow!=2?0:24);
                    }
                }

                nextJumpPeriod--;
                speed++;
                if(speed > speedMax) speed = speedMax;

                // 自機のフレーム
                if(jump < 1) player.frame += 0.5; // フレーム数の小数点は無視される？
                if (player.frame % 4 === 2) player.frame = 0 +(pow*4);
                lastMoveY = player.y - lastPositionY; // 多段ジャンプからの着地まで継続させる移動距離
                lastPositionY = player.y;

                if(bossPhase == 2){
                    //if(jump > 0)
                        player.x += (dir ? speed : speed * -1);
                    if(player.x > W -player.height +32){
                        player.x = W -player.height;
                        dir = false;
                        player.scale(-1, 1);
                    }else if(player.x < -32){
                        player.x = 0;
                        dir = true;
                        player.scale(-1, 1);
                    }
                    bossAct (boss[stage],  bd.t, bd.s, bd.f, bd.fm, bd.a, bd.p);
                }else{
                    if(scroll > 5000 && bossPhase == 0){
                        bossPhase = 1;
                        bossEncountStart(); // ボスエンカウント(途中bossPhaseが2になる)
                    }

                    scroll += speed;                       // 走った距離を記録
                    score.text = scroll.toString()+'㍍走破'; // スコア表示を更新
                    //jpLbl.text = jump.toString(); // 表示を更新

                    // 背景スクロール (画面外に出たら画面右端に移動)
                    bg1.x -= speed; // 背景1をスクロール
                    bg2.x -= speed; // 背景2をスクロール
                    if(bg1.x <= -W) bg1.x = W + bg2.x;
                    if(bg2.x <= -W) bg2.x = W + bg1.x;
                }

                // 当たり判定用スプライトを自機の上下中心に置く
                playerHit.x = player.x + player.width /2 - playerHit.width /2;
                playerHit.y = player.y + player.height/2 - playerHit.height/2;

                // 障害物の動き (enemy, timing, spd, frame, frameMax, damage, pat)
                //enemyAct(hurdle,  640, 1.0, 0, 1, -256);
                //enemyAct(igaguri, 560, 1.0, 0, 1, 200);
                //enemyAct(bird,   3000, 1.2, 0, 2, 222);
                //enemyAct(bird2,  1200, 1.2, 0, 2, 222);
                enemyAct(enemy[0],  410, 1.1, 0, 1, 120);
                enemyAct(enemy[1], 1200, 1.0, 1, 1, 100, 1);
                enemyAct(enemy[2],  560, 1.0, 2, 1, 120, 2);
                enemyAct(enemy[3],  560, 1.2, 3, 1, 150, 3);
                enemyAct(enemy[4], 2211, 2.0, 4, 1, 140, 4);
                enemyAct(enemy[5], 3010, 1.5, 3, 1, 180, 3);
                itemAct (item[0],  1025, 1.0, 0, 1, 0);
                itemAct (item[4],  2190, 1.0, 4, 1, -50);
                //itemAct (item[5],  4380, 1.0, 5, 1, -9999);

            });

            //----------------------------------------------
            // TOUCH_START: シーン全体にタッチイベントを追加
            //----------------------------------------------
            s.addEventListener(Event.TOUCH_START, function(e){
                if(isStop){
                    if(gameOver) s.removeEventListener(Event.TOUCH_START, arguments.callee); // 消す
                    return;
                }else if(nextJumpPeriod > 0){
                    return;
                }
                var playerGL = GL - player.height;
                if(player.y >= playerGL){
                    // 自機をジャンプさせる
                    jump = 1;
                    nextJumpPeriod = 2;
                    player.tl
                    .moveBy(0, -120, 12, enchant.Easing.CUBIC_EASEOUT) // x,y,frame,easing
                    .moveBy(0, 120, 12, enchant.Easing.CUBIC_EASEIN) // x,y,frame,easing
                    .then(function(){
                        jump = 0; // ジャンプ終了
                        if(isStopFlg){
                            isStopFlg = false;
                            isStop = true;
                            player.tl
                            .moveBy(-80, 0, 12, enchant.Easing.NO_EASING);
                        }
                    });
                }else if(jump < 2){
                    jump++;
                    nextJumpPeriod = 2;
                    player.tl.clear();
                    player.tl
                    .moveBy(0, -120, 12, enchant.Easing.CUBIC_EASEOUT) // x,y,frame,easing
                    .moveBy(0, 120, 12, enchant.Easing.CUBIC_EASEIN) // x,y,frame,easing
                    .waitUntil(function(){
                        // 残りの上昇分を最終落下速度で着地まで落とす
                        player.moveTo(player.x, player.y + lastMoveY);
                        if (player.y > playerGL) player.y = playerGL;
                        return player.y == playerGL;
                    }).then(function(){
                        jump = 0; // ジャンプ終了
                        if(isStopFlg){
                            isStopFlg = false;
                            isStop = true;
                            player.tl
                            .moveBy(-80, 0, 12, enchant.Easing.NO_EASING);
                        }
                    });
                }
            });

            return s; // シーンを返す
        }


        //-----------------------------
        // タイトルシーン
        //-----------------------------
        var createStartScene = function() {
            var s = new Scene();                   // 新しいシーンを作る
            s.backgroundColor = '#fcc800';         // シーンの背景色を設定
            //saveData("exp", 0);

            // 画像とラベルを配置（重ねる順）
            var bg1   = addSprite(s, W, H, 0, 0, 'bg.png');
            var bg2   = addSprite(s, W, H, W, 0, 'bg.png');
            var start = addSprite(s, 150, 156, 85, 145, 'start.png');
            var logo  = addSprite(s, W, 170, 0, 2, 'title_logo.png');
            var info  = addLabel(s, W, null, 0, 302, 'STARTを押して開始 / タッチでジャンプ', '#fff', '14px X', 'center');

            // タッチイベントを設定
            start.addEventListener(Event.TOUCH_START, function(e) {
                load();
                game_.replaceScene(createMuraScene()); // シーン置き換え
            });

            //----------------------------------------------
            // ENTER_FRAME: 毎フレームイベントをシーンに追加
            //----------------------------------------------
            s.addEventListener(Event.ENTER_FRAME, function(){
                // 背景スクロール
                bg1.x -= 0.5;                // 背景1をスクロール
                bg2.x -= 0.5;                // 背景2をスクロール
                if (bg1.x <= -W) bg1.x = W + bg2.x;   // 画面外に出たら画面右端に移動
                if (bg2.x <= -W) bg2.x = W + bg1.x;   // 画面外に出たら画面右端に移動
            });

            return s; // タイトルシーンを返す
        };

        //-----------------------------
        // ナナシ村シーン
        //-----------------------------
        var createMuraScene = function() {
            var s = new Scene();                   // 新しいシーンを作る
            s.backgroundColor = '#fcc800';         // シーンの背景色を設定

            var list = 
            ["教会"
            ,"広場"
            ,"商店"
            ,"よろず屋"
            ,"魔法の壺"
            ,"覚醒陣"
            ,"闘技場"
            ];
            var listSel = 0;

            var serifs = 
            ["ルイ、にんげん、ちがう。ルイ、おおかみ、\nだから...こっちきたら、噛む、するよ...。"
            ,"あたし、にんげんのかみかざり\nちゃんとにあう、してるかな……？"
            ,"ルイに、にんげんのこと...おしえて？\nにんげんになって、しんぷとこうびする"
            ,"しんぷ、あたま、しんぷ。"
            ,"…………。\nたのしそう……みんな。" // あたしも、ああやって……。
            //,"……？。\nだれ、あたしに、こえかけるの。"
            ,"……しんぷ？\nしんぷ、あたしに、なにかよう？" //,"……？。\nただ、こえかけただけ？"
            ,"しんぷ、ようもないのに\nあたしにはなしかける。へん。" //,"でも、いや、じゃない。"
            //,"あたしが、なにをしてるか？\nきょうみある、の？"
            ,"あたし、ひとをみてた。\nただ、それだけ。"
            //,"どうして、ひと、みてたか……？" //,"え、と……ん……。"
            ,"…………うにゅ～。\nことば、むずかしい。" //,"…………うにゅ～。"
            //,"だめ。うまく、いえない。\nことば、むずかしい。"
            //,"ごめん、しんぷ。\nあたし、うまく、つたえられない。"
            //,"きにすること、ない？" //,"……しんぷ、やさしい。"
            //,"……あたし、また、ひとをみてる。\nそれじゃあ、ね。"
            //,"しんぷ。"
            //,"あたし、まちで、きいた。\nしんぷ、いろいろなひとのなやみ、\nきいてくれる、と。"
            //,"だから……あたしも、なやみ、\nはなし、きた。"
            //,"きいて、くれる？" //,"……よかった。" //,"はなしの、ないよう？"
            //,"え、と……。すこし、まって。\nことば、さがす、から。"
            //,"うにゅ……ぅぅ～。"
            ,"え、と……。すこし、まって。\nうにゅ……ぅぅ～。…………キラッ☆"//表情テスト
            //,"あ、あたし、ふつうの、\nにんげんのおんなのこ、なりたい。\nどうすれば、なれる？"
            //,"あたし、もとからにんげん……？" //,"それ、ちがう。\nあたし、ふつうじゃない。"
            //,"あたし、にんげんじゃなくて、\nおおかみ、そだてられた。"
            //,"そのせいか、まわりのひとと、\nはなし、あわない。\nかんがえてること、ちがう。"
            //,"だけど、まわりとちがう。いや。\nあたし、にんげん、なりたい。\nふつうに、なりたい。"
            //,"……どうすればいい？" //,"……すぐには、おもいつかない？"
            //,"……ざんねん。\nでも、しかたない。"
            //,"あたし、ずっとかんがえてる。\nだけど、おもいうかばない。"
            //,"だから、しんぷ、おもいうかばない。\nぜんぜん、おかしくない。"
            //,"ほうほう、かんがえておく？" //,"……しんぷ、ありがとう。"
            //,"しんぷ、しんねん。\nあけまして、おめでとう☆" //新年用
            ];
            //var ny = loadData("rui_newyear2016"); saveData("rui_newyear2016", "1");
            //var serif = serifs[ny==null||ny!="1"?serifs.length-1:rand(serifs.length)];
            //var serif = serifs[rand(serifs.length)];
            var serifRead = "";
            var mobMax    = 5;
            var rowMax    = 5;
            var faceMax   = 6;
            var wait      = 4;

            // 画像とラベルを配置（重ねる順）
            var bg1   = addSprite(s, W, H, 0, 0, 'mura.png');
            var quest = addSprite(s, 100, 100, W-100, H-100, null);
            var level = addLabel(s, 82, null, 10, 32, lv.toString(), '#fff', '38px X', 'center');
            var text1 = addLabel(s, W, null, 110, 8, "Exp " + exp.toString(), '#fff', '14px X', 'left');
            var text2 = addLabel(s, W, null, 110, 26, "あと " + expRest.toString(), '#fff', '14px X', 'left');
            var mob   = [];
            for(var i=0; i<mobMax; i++){
                mob[i] = {
                    time: 0, pos: null, die: false, txt: 0,
                    box : addSprite(s, 100, 36, W, H, 'serif.png', 0),
                    msg : addLabel(s, 100, null, W, H, '', '#000', '10px X', 'center')
                };
            }
            for(var i=0; i<mobMax; i++){ // 上に重ねるため分ける
                mob[i].hit =  addSprite(s, 24, 24, W, H, 'blood.png', 0);
                // タッチイベントを設定
                mob[i].hit.addEventListener(Event.TOUCH_START, function(e) {
                    mobHit(this);
                });
            }

            var msg   = [];
            for(var i=0; i<rowMax; i++){
                msg[i] = addLabel(s, 200, null, 13, H-44+(11*i), '', '#000', '10px X', 'left');
            }

            var rui   = {
                eyesT: 0, mouseT: 0, face: null,
                eyes  : addSprite(s, 27, 11, 64, 226, 'face.png', faceMax*0),
                mouse : addSprite(s, 27, 11, 64, 237, 'face.png', faceMax*1)
            };

            var mobPos = 
            [[0, 13,130] ,[0,103,122] ,[0,191,102]
            ,[0, 75,156] ,[0,177,158] ,[0,227,176]
            ,[0, 67,182] ,[0,127,204] ,[0,175,214]
            ,[0,156,240]
            ];
            var mobTxt = 
            ["ﾙｲﾁｬﾝ"
            ,"ﾙｲﾁｬﾝｶﾜｲｲ"
            ,"ﾙｲﾁｬﾝKAWAII"
            ,"ﾙｲﾁｬﾝｸｻｲ"
            ,"ﾙｲﾁｬﾝKUSAI"
            ,"ﾙｲﾁｬﾝﾌﾞｻｲｸ"
            ];
            var mobHit = function(hit){
                var mobX; // mob[i]を探す
                for(var j=0; j<mobMax; j++){
                    if(mob[j].hit.x == hit.x && mob[j].hit.y == hit.y){
                        mobX = mob[j];
                        break;
                    }
                }
                if(mobX.die || mobX.pos==null) return;
                mobX.die = true;
                mobX.hit.frame = 1;
                mobX.time = 6;
                if(mobX.txt < 3){
                    // OK
                }else{
                    // NG
                }
            }

            var talk = function(str){
                var row = str.split("\n");
                for(var i=0; i<rowMax; i++){
                    msg[i].text = row.length > i ? row[i] : '';
                }
                serifRead = str.replace(/\n/g,"...").replace(/[…。]/g,"...").replace(/[、]/g,"..")
                .replace(/[？?！!ーっッ]/g,"～")
                .replace(/[かさたなはまやらわがざだばぱぁゃアカサタナハマヤラワガザダバパァャ噛]/g,"あ")
                .replace(/[きしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィ]/g,"い")
                .replace(/[くすつぬふむゆるぐずづぶぷぅゅウクスツヌフムユルグズヅブプゥュヴ]/g,"う")
                .replace(/[けせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェ]/g,"え")
                .replace(/[こそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョ]/g,"お")
                .replace(/[ン\.]/g,"ん");
                rui.mouseT = 0;
            }
            talk(serifs[rand(serifs.length)]);

            // タッチイベントを設定
            quest.addEventListener(Event.TOUCH_START, function(e) {
                game_.replaceScene(createSelDungeonScene()); // シーン置き換え
            });

            //----------------------------------------------
            // ENTER_FRAME: 毎フレームイベントをシーンに追加
            //----------------------------------------------
            s.addEventListener(Event.ENTER_FRAME, function(){
                for(var i=0; i<mobMax; i++){
                    if(mob[i].time == 0){
                        mob[i].time = 50 + rand(200);
                        if(mob[i].pos != null){
                            mobPos[mob[i].pos][0] = 0;
                            mob[i].pos = null;
                        }
                        mob[i].die = false;
                        mob[i].hit.frame = 0;
                        mob[i].hit.x = W; // 非表示でもクリックの邪魔をするので画面外へ
                        mob[i].hit.y = H; // 非表示でもクリックの邪魔をするので画面外へ
                        mob[i].hit.visible = false;
                        mob[i].box.visible = false;
                        mob[i].msg.visible = false;
                    }else if(mob[i].time == 50){
                        var arr = [];
                        for(var j=0; j<mobPos.length; j++){
                            if(mobPos[j][0] == 0) arr.push(j);
                        }
                        if(arr.length == 0){
                            mob[i].time = 50 + rand(100);
                        }else{
                            var txtNum = rand(mobTxt.length);
                            var pos = arr[rand(arr.length)];
                            mobPos[pos][0] = 1;
                            mob[i].pos = pos;
                            mob[i].hit.x = mobPos[pos][1];
                            mob[i].hit.y = mobPos[pos][2];
                            mob[i].box.x = mobPos[pos][1] -9;
                            mob[i].box.y = mobPos[pos][2] -26;
                            mob[i].msg.x = mobPos[pos][1] -9  +2;
                            mob[i].msg.y = mobPos[pos][2] -26 +5;
                            mob[i].hit.visible = true;
                            mob[i].box.visible = true;
                            mob[i].msg.visible = true;
                            mob[i].box.frame = rand(2);
                            mob[i].txt = txtNum;
                            mob[i].msg.text = mobTxt[txtNum] + ["", "..", "!!"][rand(3)];
                        }
                    }else if(mob[i].die){
                        switch(mob[i].time){
                        case 6: mob[i].hit.frame = 1; break;
                        case 4: mob[i].hit.frame = 2; break;
                        case 2: mob[i].hit.frame = 3; break;
                        }
                    }
                    mob[i].time--;
                }
                if(rui.mouseT < serifRead.length * wait){
                    rui.mouseT++;
                    if(rui.mouseT % wait == 0){
                        var s = serifRead.substr(rui.mouseT / wait -1, 1);
                        //text2.text = serifRead; text1.text = s;
                        if(s == "～"){ // [？?！!ーっッ]
                            //ignone
                        }else if(s == "☆"){
                            rui.face = [3,1];
                        }else{
                            rui.face = null;
                            if(s == "ん"){ // [ン、。….\n]
                                rui.mouse.frame = 0 + faceMax;
                            }else if(s == "あ"){
                                rui.mouse.frame = 1 + faceMax;
                            }else if(s == "い"){
                                rui.mouse.frame = 2 + faceMax;
                            }else if(s == "う"){
                                rui.mouse.frame = 3 + faceMax;
                            }else if(s == "え"){
                                rui.mouse.frame = 4 + faceMax;
                            }else if(s == "お"){
                                rui.mouse.frame = 5 + faceMax;
                            }else{
                                rui.mouse.frame = rand(faceMax) + faceMax;
                            }
                        }
                    }
                }else{
                    rui.mouse.frame = faceMax;
                }
                if(rui.face != null){
                    rui.eyes.frame  = rui.face[0];
                    rui.mouse.frame = rui.face[1] + faceMax;
                }else if(rui.eyesT <= 0){
                    rui.eyes.frame = 0;
                    rui.eyesT = rand(4)==0 ? 6 : (128 + (rand(128)-64));
                }else{
                    rui.eyesT--;
                    if(rui.eyesT == 4) rui.eyes.frame = 1;
                    if(rui.eyesT == 2) rui.eyes.frame = 2;
                }
            });

            return s; // タイトルシーンを返す
        };

        //-----------------------------
        // ダンジョン選択シーン
        //-----------------------------
        var createSelDungeonScene = function() {
            var s = new Scene();                   // 新しいシーンを作る
            s.backgroundColor = '#fcc800';         // シーンの背景色を設定

            var list = 
            ["マグナ活火山"
            ,"ウンディーネの地底湖"
            ,"ドリュアスの森"
            ,"雷鳴の塔"
            ,"ルクス遺跡"
            ,"暗黒の地下通路"
            ,"忘れられた廃教会"
            ];
            var listSel = 0;

            // 画像とラベルを配置（重ねる順）
            var bg1   = addSprite(s, W, H, 0, 0, 'map.png');
            var info  = addLabel(s, W, null, 0, H-44, list[listSel], '#fff', '14px X', 'center');
            var back  = addSprite(s, 80, 38, 0, 0, null);
            var start = addSprite(s,  W, 65, 0, H-65, null);
            var selL  = addSprite(s, 60, 65, 0, H-65, null);
            var selR  = addSprite(s, 60, 65, W-60, H-65, null);

            // タッチイベントを設定
            selL.addEventListener(Event.TOUCH_START, function(e) {
                listSel--; if(listSel < 0) listSel = list.length - 1;
                info.text = list[listSel];
            });
            selR.addEventListener(Event.TOUCH_START, function(e) {
                listSel++; if(listSel > list.length - 1) listSel = 0;
                info.text = list[listSel];
            });
            start.addEventListener(Event.TOUCH_START, function(e) {
                stage = listSel;
                game_.replaceScene(createGameScene()); // シーン置き換え
            });
            back.addEventListener(Event.TOUCH_START, function(e) {
                game_.replaceScene(createMuraScene()); // シーン置き換え
            });

            return s; // タイトルシーンを返す
        };

        //-----------------------------
        // ステージクリアシーン
        //-----------------------------
        var createStageclearScene = function(scroll, bExp) {
            var s = new Scene();                      // 新しいシーンを作る
            s.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // シーンの背景色を設定

            exp = Number(exp) + Number(scroll) + Number(bExp);
            save();

            // 画像とラベルを配置（重ねる順）
            var overbg = addSprite(s, W, H, 0, 0, 'stageclearbg.png');
            var next = addSprite(s, 110, 32, W/2-60, 276, null);
            var score = addLabel(s, W, null, 40, 130,
                '距離 ' + scroll.toString() + ' ㍍<br>'
                + '撃破 ' + bExp.toString() + ' pt<br>'
                + '合計 ' + (Number(scroll)+Number(bExp)) + ' pt', '#fff');

            // タッチイベントを追加
            next.addEventListener(Event.TOUCH_END, function(){
                game_.popScene();                       // このシーンを剥がす（pop）
                game_.replaceScene(createMuraScene()); // シーン入れ替え(replace)
            });

            return s; // シーンを返す
        };

        //-----------------------------
        // ゲームオーバーシーン
        //-----------------------------
        var createGameoverScene = function(scroll) {
            var s = new Scene();                      // 新しいシーンを作る
            s.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // シーンの背景色を設定

            exp = Number(exp) + Number(scroll);
            save();

            // 画像とラベルを配置（重ねる順）
            var overbg = addSprite(s, W, H, 0, 0, 'gameoverbg.png');
            var next = addSprite(s, 110, 32, W/2-60, 276, null);
            //var retry = addSprite(s, W, 32, 0, 284, 'retry_button.png');
            var score = addLabel(s, W, null, 0, 8, scroll.toString(), '#fff', '96px X', 'center');
            var info  = addLabel(s, W, null, 0, 110, '㍍走り抜いた', '#fff', '32px X', 'center');

            // タッチイベントを追加
            next.addEventListener(Event.TOUCH_END, function(){
                game_.popScene();                       // このシーンを剥がす（pop）
                game_.replaceScene(createStartScene()); // シーン入れ替え(replace)
            });

            return s; // シーンを返す
        };

        //-----------------------------
        // ※ ここがはじまり
        //-----------------------------
        game_.replaceScene(createStartScene()); // _rootSceneをスタートシーンに置き換え
    }
    game_.start(); // ゲームをスタートさせます
}

//----------------------------------------------------------
// 関数群
//----------------------------------------------------------
function lvCal(exp){
	lv = 1;
	hpMax = 127;
	atk = 64;
	expNext = 100;
	var lvup  = 1.16;
	var hpup  = 24;
	var atup  = 2.6;
	do{ // Math.round:四捨五入, Math.ceil:切り上げ, Math.floor:切り捨て
		expNext = Math.ceil( expNext * lvup + (100 * (lv - 1)) );
		if(exp >= expNext){ lv++; hpMax += hpup; atk += atup; }
	}while(exp > expNext);
	atk = Math.ceil(atk);
	expRest = expNext - exp;
}
function rand(num){
	return Math.floor( Math.random() * num );
}
function img(str){
	return IMG_DIR + str;
}
function asset(str){
	return game_.assets[img(str)];
}
function addSprite(scene, w, h, x, y, imgStr, frame){
	var sprite = new Sprite(w, h); // スプライトを作る
	if(imgStr != null) sprite.image = asset(imgStr); // 画像を設定
	if(x      != null) sprite.x = x;                 // 横位置調整
	if(y      != null) sprite.y = y;                 // 縦位置調整
	if(frame  != null) sprite.frame = frame;         // frame
	if(scene  != null) scene.addChild(sprite);       // シーンに追加
	return sprite;
}
function addLabel(scene, w, h, x, y, text, color, font, align){
	var label = new Label(text); // ラベルを作る
	if(w      != null) label.width = w;             // 幅調整
	if(x      != null) label.x = x;                 // 横位置調整
	if(y      != null) label.y = y;                 // 縦位置調整
	if(color  != null) label.color = color;         // ex)'#FFFFFF'
	if(font   != null) label.font = font;           // ex)'28px sans-serif'
	if(align  != null) label.textAlign = align;     // ex)'center'
	if(scene  != null) scene.addChild(label);       // シーンに追加
	return label;
}
//-------------------------------------
// ユーザデータを保存
//-------------------------------------
function save(){
	var err = "";
	var chk = 
	[saveData("rui_evo", evo[0] + ',' + evo[1] + ',' + evo[2] + ',' + evo[3])
	,saveData("rui_pow", pow)
	,saveData("exp", exp)
	];
	lvCal(exp);
	// エラーチェック
	for(var i=0; i<chk.length; i++){
		if(chk[i] != null) err += chk[i] + (i<chk.length-1 ? ", " : "");
	}
	if(err.length > 0) alert("データが保存できませんでした\nkey: " + err);
}
function saveData(key, val){
	var err = "非対応";
	if(isIe){
		setCookie(key, val, 365);
		err = getCookie(key) == val ? null : key;
	}else if(isLocalStorageEnabled){
		setLocalStorage(key, val);
		err = getLocalStorage(key) == val ? null : key;
	}
	//if(err != null) alert("データが保存できませんでした :" + key);
	return err;
}
//-------------------------------------
// 保存データを取得
//-------------------------------------
function load(){
	try{ // 1つ目のロード時、第2引数を付けてロード環境をチェックする
		var evoTmp = loadData("rui_evo", true).split(",");
		evo[0] = Number(evoTmp[0]);
		evo[1] = Number(evoTmp[1]);
		evo[2] = Number(evoTmp[2]);
		evo[3] = Number(evoTmp[3]);
	}catch(e){ evo = [0,0,0,0]; }
	pow = loadData("rui_pow");
	exp = loadData("exp");
	if(pow == null) pow = 0;
	if(exp == null) exp = 0;
	lvCal(exp);
}
function loadData(key, chkBool){
	if(isIe){
		return getCookie(key);
	}else if(isLocalStorageEnabled){
		return getLocalStorage(key);
	}else{
		if(chkBool) alert("データが読み込めませんでした");
	}
}
//-------------------------------------
// ローカルストレージ
//-------------------------------------
// 有効か
var isLocalStorageEnabled = (('localStorage' in window) && window['localStorage'] !== null);
// 保存
var setLocalStorage = (function(){
	if(!isLocalStorageEnabled) return null;
	return function(key, data) { localStorage.setItem(key, data) };
})();
// 取得
var getLocalStorage = (function(){
	if(!isLocalStorageEnabled) return null;
	return function(key) { try{ return localStorage.getItem(key); }catch(e){ return null; } };
})();
//-------------------------------------
// cookie
//-------------------------------------
// 保存
// data・・・cookieに格納する連想配列
// period・・・cookieの有効期間(日)
var setCookie = (function(){
	return function(key, val, period) {
		var cookie = key + '=' + encodeURIComponent(val) + ';';
		var expire = new Date();
		expire.setTime( expire.getTime() + 1000 * 3600 * 24 * period);
		expire.toUTCString();
		cookie += 'expires=' + expire+';';
		document.cookie = cookie;
	};
})();
// 取得
var getCookie = (function(){
	return function(key) {
		var val = null;
		var cookies = document.cookie;
		if(cookies == '') return val; // 無いので終了
		var cookieArray = cookies.split(';');
		for(var i = 0; i < cookieArray.length; i++){
			var cookie = cookieArray[i].split('=');
			if(cookie[0].replace(/^[\s　]+|[\s　]+$/g, "") != key) continue;
			val = decodeURIComponent(cookie[1]);
			break;
		}
		return val;
	}
})();
