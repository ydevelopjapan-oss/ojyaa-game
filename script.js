const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
let canMove = true;

addEventListener("keydown", (e)=>{
    
    if(!keys[e.key]){
        keys[e.key] = true;
        canMove = true;
    }
});

addEventListener("keyup", (e)=>{
    keys[e.key] = false;
    canMove = false;
});

let gameState = "title";

const player = {
    row: 1,
    col: 1,
    color: "blue",
    speed: 1,
    fingers: 0,
    knockingDoor: null,
    lastKnockedDoor: null,
    justKnockedDoor: false,
    exitDr: 0,
    exitDc: 0,
    hasPassedDoor: false,
    leftOjyaaMessageShown: false,
    upperLeftOjyaaMessageShown: false
};

function createOjyaa(row, col){

    return {
        row: row,
        col: col,
        color: "orange",
        animation: true,
        size: 5,
        showMessage: false,
    };

}

function createObject(objectInfo, catalog){
    return{
        row: objectInfo.row,
        col: objectInfo.col,
        fingers: objectInfo.fingers,
        state: objectInfo.state,
        color: catalog.color,
        type: catalog.type
    }
}

const moveTable = {
    patrol: movePatrol,
    escape: moveEscape,
    chase: moveChase,
    random: moveRandom
};

function createEnemy(enemyInfo, catalog){
    return{
        row: enemyInfo.row,
        col: enemyInfo.col,
        direction: enemyInfo.direction,
        fingers: enemyInfo.fingers,
        catchingPlayer: enemyInfo.catchingPlayer,
        color: catalog.color,
        speed: catalog.speed,
        type: catalog.type,
        wallAction: catalog.wallAction
    }
}

const objectCatalog = [

    {
        type: "key",
        color: "gold",
    },

    {
        type: "door",
        color: "brown"
    },

    {
        type: "exit",
        color: "lime"
    }

];

const enemyCatalog = [
    {
        color:"red",
        speed:1,
        type:"patrol",

        wallAction: reverseDirection    
    },
    {
        color:"purple",
        speed:1,
        type:"random",

        wallAction: reverseDirection    
    },
    {
        color:"green",
        speed:1,
        type:"escape",

        wallAction: changeToChase    
    }
]

const stages = [
    {
        map: [
            ["#","#","#","#","#","#","#","#","#","#","#","#"],
            ["#",".",".",".",".",".",".",".",".",".",".","#"],
            ["#",".",".","#","#","#",".",".",".","#",".","#"],
            ["#",".",".",".",".",".",".",".",".",".",".","#"],
            ["#",".",".",".",".",".","#","#","#",".",".","#"],
            ["#",".",".",".",".",".",".",".",".",".",".","#"],
            ["#","#","#","#","#","#","#","#","#","#","#","#"]
        ],

        player: {
            row: 1,
            col: 1
        },
    
        objectData: [

            {
                catalogIndex:0,//key
                row:5,
                col:1,
                fingers:4,
                state: "untaken"
            },

            {
                catalogIndex:0,//key
                row:4,
                col:2,
                fingers:8,
                state: "untaken"
            },

            {
                catalogIndex:0,//key
                row:3,
                col:5,
                fingers:7,
                state: "untaken"
            },

            {
                catalogIndex:0,//key
                row:5,
                col:8,
                fingers:3,
                state: "untaken"
            },
            
            {
                catalogIndex:1,//door
                row:1,
                col:9,
                fingers:6,
                state: "locked"
            },

            {
                catalogIndex:1,//door
                row:2,
                col:10,
                fingers:5,
                state: "locked"
            },

            {
                catalogIndex:2,//exit
                row:1,
                col:10,
                fingers:0,
                state: "exit"
            },


        ],

        enemyData: [
            {
                catalogIndex: 0,
                row: 3,
                col: 5,
                direction: 1,
                fingers: 2,
                catchingPlayer: false
            },
            {
                catalogIndex: 1,
                row: 5,
                col: 8,
                direction: -1,
                fingers: 5,
                catchingPlayer: false
            }
        ]
    }
    
]

let currentStage = 0;

let map;
let objects;
let enemies;

function loadStage(){
    map = structuredClone(
        stages[currentStage].map
    );
    
    player.row = stages[currentStage].player.row;
    player.col = stages[currentStage].player.col;
    player.fingers = 0;

    objects = [];
    let objectData = stages[currentStage].objectData;
    for(let i = 0; i < objectData.length; i++){

        let objectInfo = objectData[i];
        let catalog = objectCatalog[objectInfo.catalogIndex];

        objects.push(
            createObject(objectInfo, catalog)
        );
    
    }

    enemies = [];
    let enemyData = stages[currentStage].enemyData;
    for(let i = 0; i < enemyData.length; i++){

        let enemyInfo = enemyData[i];
        let catalog = enemyCatalog[enemyInfo.catalogIndex];

        enemies.push(
            createEnemy(enemyInfo, catalog)
        );
    
    }
}

function canPassObject(object){

    if(object.type !== "door"){
        return true;
    }

    if(object.state === "open"){
        return true;
    }

    let totalFingers =
        player.fingers + object.fingers;
    return  totalFingers % 10 === 0;
}

function moveCharacter(character,dr, dc){

    let newRow = character.row + dr * character.speed;
    let newCol = character.col + dc * character.speed;

    if(map[newRow][newCol] === "#"){
        
        if(character.wallAction){
             character.wallAction(character);
        }
       
        return false;
    };

    for(let i = 0; i < objects.length; i++){

        let object = objects[i];

        if(
            object.row === newRow &&
            object.col === newCol
        ){
            
            if(!canPassObject(object)){
                return false;
            }

        // ドアを通過した
            if(
                character === player &&
                object.type === "door"
            ){

                let direction = getExitDirection(object);

                player.exitDr = direction.dr;
                player.exitDc = direction.dc;

                player.knockingDoor = null;
                player.hasPassedDoor = true;
            }    

        }
        
    }

    character.row = newRow;
    character.col = newCol;
   
     return true;

}

function getExitDirection(door){

    for(let i = 0; i < objects.length; i++){

        let object = objects[i];

        if(object.type !== "exit"){
            continue;
        }

        let dr = object.row - door.row;
        let dc = object.col - door.col;

        if(Math.abs(dr) + Math.abs(dc) === 1){

            return {
                dr: dr,
                dc: dc
            };

        }

    }

    return {
        dr: 0,
        dc: 0
    };

}

function movePlayer(){

    if(!canMove){
        return;
    }

    let dr = 0;
    let dc = 0;

    if(keys["ArrowRight"]){
        dc = 1;
    }
    else if(keys["ArrowLeft"]){
        dc = -1;
    }
    else if(keys["ArrowUp"]){
        dr = -1;
    }
    else if(keys["ArrowDown"]){
        dr = 1;
    }

    if(
        player.exitDr === 0 &&
        player.exitDc === 0
    ){
        moveCharacter(player, dr, dc);
    }
    else if(
        player.exitDr === dr &&
        player.exitDc === dc
    ){
        moveCharacter(player, dr, dc);
    }
    if(leftOjyaa){
        leftOjyaa.showMessage = false;
    }
    if(upperLeftOjyaa){
        upperLeftOjyaa.showMessage = false;
    }

    canMove = false;
}

function moveEnemy(){
    enemyMoveCount++;
    if(enemyMoveCount < 15){
       return;
    }
    for(let i = 0; i < enemies.length; i++){

        let enemy = enemies[i];
        moveTable[enemy.type](enemy);
    }
    enemyMoveCount = 0;
}

let enemyMoveCount = 0;

function movePatrol(enemy){

    moveCharacter(enemy, 0, enemy.direction);

}

function moveEscape(enemy){

    let dr = enemy.row - player.row;
    let dc = enemy.col - player.col; 

    if(dr > 0){
        moveCharacter(enemy, 1, 0);
    }
    else{
        moveCharacter(enemy, -1, 0);
    }

    if(dc > 0){
        moveCharacter(enemy, 0, 1);
    }
    else{
        moveCharacter(enemy, 0, -1);
    }
           
}

function moveChase(enemy){

    if(enemy.row < player.row){
        moveCharacter(enemy, 1, 0);
    }

    if(enemy.row > player.row){
        moveCharacter(enemy, -1, 0);
    }

    if(enemy.col < player.col){
        moveCharacter(enemy, 0, 1);
    }

    if(enemy.col > player.col){
        moveCharacter(enemy, 0, -1);
    }
           
}

function moveRandom(enemy){

    let r = Math.random();

    if(r < 0.25){
        moveCharacter(enemy, 1, 0);
    }
    else if(r < 0.5){
        moveCharacter(enemy, -1, 0);
    }
    else if(r < 0.75){
        moveCharacter(enemy, 0, 1);
    }
    else{
        moveCharacter(enemy, 0, -1);
    }

}

function reverseDirection(character){
    character.direction *= -1;
}

function changeToChase(character){
    character.type = "chase";
}

function gameOver(){

    gameState = "gameOver";

}

function resetGame(){

    gameState = "playing";

    loadStage();

    message.textContent = "";
    
}

function checkObjectHit(){
    for(let i = 0; i < objects.length; i++){
        let object = objects[i];
        if(
            player.row === object.row &&
            player.col === object.col
        ){
            if(object.type === "key"){

                if(object.state === "untaken"){

                    player.fingers += object.fingers;
                    object.state = "taken";
                }

            }
            
            if(object.type === "exit"){
                player.fingers = 0;
                stageClear();

            }
        }
    }
}

function checkKnockingDoor(){

    if(player.justKnockedDoor){

        let distance =
            Math.abs(player.row - player.lastKnockedDoor.row) +
            Math.abs(player.col - player.lastKnockedDoor.col);

        if(distance >= 3){
            player.justKnockedDoor = false;
        }
    }
        
    player.knockingDoor = null;

    for(let i = 0; i < objects.length; i++){

        let object = objects[i];
        if(
            object.type === "exit" &&
            player.row === object.row &&
            player.col === object.col
        ){
            return;
        }
    }

    for(let i = 0; i < objects.length; i++){

        let object = objects[i];
        if(
            object.type === "door" &&
            Math.abs(player.row - object.row) +
            Math.abs(player.col - object.col) <= 1
        ){

            player.knockingDoor = object;
            player.lastKnockedDoor = object;
            player.justKnockedDoor = true;

            return;

        }

    }
  
}

let doorOjyaa = null;
let upperLeftOjyaa = null;
let leftOjyaa = null;
let exitOjyaa = null;

function checkOneOjyaa(fingers, ojyaa, row, col){

    if(Math.floor(fingers / 10) >= 1){

        if(ojyaa === null){

            return createOjyaa(row, col);

        }

        return ojyaa;

    }

    return null;

}

function checkOjyaa(){

    let fingers = getFingerDisplay();

    leftOjyaa = checkOneOjyaa(
        fingers.leftFingers,
        leftOjyaa,
        player.row,
        player.col - 1
    );

    upperLeftOjyaa = checkOneOjyaa(
        fingers.upperLeftFingers,
        upperLeftOjyaa,
        player.row - 1,
        player.col - 1
    );

    if(player.knockingDoor !== null){

        doorOjyaa = checkOneOjyaa(
            fingers.doorFingers,
            doorOjyaa,
            player.knockingDoor.row,
            player.knockingDoor.col
        );

        // 出口オブジェクトを探す
        let exit = objects.find(
            object => object.type === "exit"
        );

        exitOjyaa = checkOneOjyaa(
            fingers.exitFingers,
            exitOjyaa,
            exit.row,
            exit.col
        );

    }
    else if(!player.hasPassedDoor){

        doorOjyaa = null;
        exitOjyaa = null;

    }

}

function checkEnemyHit(){
    for(let i = 0; i < enemies.length; i++){
        let enemy = enemies[i];
        if(
            player.row === enemy.row &&
            player.col === enemy.col
        ){
            if(enemy.catchingPlayer === false){

                player.fingers -= enemy.fingers;
                enemy.catchingPlayer = true;
            }
        }
        else{
            enemy.catchingPlayer = false;
        }
    }
}

function checkGameOver(){
    if(player.fingers < 0){
        gameState = "gameOver";
    }
}

function stageClear(){

    if(currentStage + 1 >= stages.length){

        gameClear();

    }
    else{

        gameState = "stageClear";

    }
}

function gameClear(){

    gameState = "gameClear";

}

function nextStage(){

    
    currentStage++;

    loadStage();

    gameState = "playing";

}

function drawTitleScreen(){

    ctx.fillStyle = "lightblue";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "black";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(
        "おじゃあ！",
        canvas.width / 2,
        80
    );

    ctx.font = "24px sans-serif";

    ctx.fillText(
        "PRESS SPACE KEY",
        canvas.width / 2,
        180
    );

    ctx.font = "18px sans-serif";

    ctx.fillText(
        "↑↓←→ : MOVE",
        canvas.width / 2,
        240
    );

    ctx.fillText(
        "R : RESET",
        canvas.width / 2,
        270
    );

    ctx.textAlign = "left";

}

const TITLE_HEIGHT = 60;
const HUD_HEIGHT = 60;
const GAME_Y = TITLE_HEIGHT + HUD_HEIGHT;

function drawBackground(){

    ctx.fillStyle = "lightblue";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

}

function drawTitle(){

    ctx.fillStyle = "black";
    ctx.font = "bold 42px sans-serif";

    ctx.textAlign = "center";

    ctx.fillText(
        "おじゃあ！",
        canvas.width / 2,
        45
    );

    ctx.textAlign = "left";

}

function drawPanel(){

    ctx.fillStyle = "#222";

    ctx.fillRect(
        0,
        60,
        canvas.width,
        60
    );

}

const blockSize = 40;

function drawMap(){

    for(let y = 0; y < map.length; y++){

        for(let x = 0; x < map[y].length; x++){

            if(map[y][x] === "#"){

                ctx.fillStyle = "gray";
            }
            else if(map[y][x] === "K"){
                ctx.fillStyle = "gold";
            }
            else if(map[y][x] === "D"){
                ctx.fillStyle = "brown";
            }
            else if(map[y][x] === "E"){
                 ctx.fillStyle = "lime";
            }
            else if(map[y][x] === "G"){
                 ctx.fillStyle = "cyan";
            }
            else{
                ctx.fillStyle = "white";
            }
                
            ctx.fillRect(
                x * blockSize,
                y * blockSize + GAME_Y,
                blockSize,
                blockSize
            );

        }

    }

}

const fingerImages = {};

for(let i = 1; i <= 5; i++){

    const image = new Image();

    image.src = "images/finger" + i + ".png";

    fingerImages[i] = image;

}

function drawFingers(fingers, x, y){

    let size = blockSize / 2;

    ctx.fillStyle = "black";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(
        fingers,
        x + size,
        y - size / 4
    );
    ctx.textAlign = "left";

    if(fingers <= 0){
        return;
    }

    // 5本以下
    if(fingers <= 5){

        ctx.drawImage(
            fingerImages[fingers],
            x,
            y,
            size,
            size
        );

        return;
    }

    // 6本以上10本以下
    else if(fingers <= 10){
        ctx.drawImage(
            fingerImages[5],
            x,
            y,
            size,
            size
        );

        ctx.drawImage(
            fingerImages[fingers - 5],
            x + size,
            y,
            size,
            size
        );
    }
}

function getFingerDisplay(){

    // ドアの隣にいない
    if(player.knockingDoor === null){

        let totalFingers = player.fingers;

        if(player.fingers < 20){
            return {
                upperLeftFingers: 0,
                leftFingers: Math.floor(totalFingers / 10) * 10,
                playerFingers: totalFingers % 10,
                doorFingers: 0
            };
        }
        return {
                upperLeftFingers: 10,
                leftFingers: 10,
                playerFingers: totalFingers % 10,
                doorFingers: 0,
                exitFingers: 0
            };

    }

    // ドアの隣にいる
    let totalFingers =
        player.fingers + player.knockingDoor.fingers;

    // 10本未満
    if(totalFingers < 10){

        return {
            upperLeftFingers: 0,
            leftFingers: 0,
            playerFingers: totalFingers,
            doorFingers: 0,
            exitFingers: 0
        };

    }

    // 10本以上
    else if(totalFingers < 20){

        return {
            upperLeftFingers: 0,
            leftFingers: 0,
            playerFingers: totalFingers - 10,
            doorFingers: 10,
            exitFingers: 0
        };
    }

    return {
            upperLeftFingers: 0,
            leftFingers: 0,
            playerFingers: totalFingers - 20,
            doorFingers: 10,
            exitFingers: 10
    };

}

function drawPlayer(){

    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.col * blockSize,
        player.row * blockSize + GAME_Y,
        blockSize,
        blockSize
    );

    let fingers = getFingerDisplay();

    drawFingers(
        fingers.playerFingers,
        player.col * blockSize,
        player.row * blockSize + blockSize / 2 + GAME_Y
    );

}

function drawObject(){

    for(let i = 0; i < objects.length; i++){
        let object = objects[i];

        if(object.state === "taken"){
            continue;
        }

        ctx.fillStyle = object.color;

        ctx.fillRect(
            object.col * blockSize,
            object.row * blockSize + GAME_Y,
            blockSize,
            blockSize
        );

        if(object.type === "exit"){
            continue;
        }
        
        // ノック中のドア
        if(object === player.knockingDoor){

            let fingers = getFingerDisplay();

            drawFingers(
                fingers.doorFingers,
                object.col * blockSize,
                object.row * blockSize + blockSize / 2 + GAME_Y
            );

        }
        // 普通のオブジェクト
        else{

            drawFingers(
                object.fingers,
                object.col * blockSize,
                object.row * blockSize + blockSize / 2 + GAME_Y
            );

        }


    }

}

function followPlayer(ojyaa, rowOffset, colOffset){

    if(ojyaa === null){
        return;
    }

    ojyaa.row = player.row + rowOffset;
    ojyaa.col = player.col + colOffset;

}

function animateOjyaa(ojyaa){

    if(ojyaa === null){
        return;
    }

    if(ojyaa.animation){

        ojyaa.size += 2;

        if(ojyaa.size >= blockSize / 2){

            ojyaa.size = blockSize / 2;
            ojyaa.animation = false;
            ojyaa.showMessage = true;

        }

    }

}

function semiAnimateOjyaa(ojyaa){

    if(ojyaa === null){
        return;
    }
    
    if(ojyaa.animation){

        ojyaa.size = blockSize / 2;
        ojyaa.animation = false;
    
    }
}

function updateOjyaa(){

    animateOjyaa(doorOjyaa);
    animateOjyaa(exitOjyaa);

    if(!player.justKnockedDoor){
        animateOjyaa(leftOjyaa);
        animateOjyaa(upperLeftOjyaa);
    }
    else{
        semiAnimateOjyaa(leftOjyaa);
        semiAnimateOjyaa(upperLeftOjyaa);
    }

    followPlayer(leftOjyaa, 0, -1);
    followPlayer(upperLeftOjyaa, -1, -1);

}

function drawOneOjyaa(ojyaa){

    if(ojyaa === null){
        return;
    }

    let x = ojyaa.col * blockSize;
    let y = ojyaa.row * blockSize - blockSize / 4 + GAME_Y;

    let size = ojyaa.size;

    let offset = (blockSize - size) / 2;

    //指10本
    drawFingers(
        10,
        ojyaa.col * blockSize,
        ojyaa.row * blockSize + blockSize / 2 + GAME_Y
    );

    // おじゃあの体
    ctx.fillStyle = "orange";

    ctx.fillRect(
        x + offset,
        y + offset,
        size,
        size
    );

    // 目の大きさ
    let eyeSize = size / 8;

    // 目の位置
    let eyeY = y + offset + size * 0.3;

    let leftEyeX = x + offset + size * 0.3;
    let rightEyeX = x + offset + size * 0.7;

    ctx.fillStyle = "black";

    ctx.fillRect(
        leftEyeX,
        eyeY,
        eyeSize,
        eyeSize
    );

    ctx.fillRect(
        rightEyeX,
        eyeY,
        eyeSize,
        eyeSize
    );

    // 口
    ctx.fillRect(
        x + offset + size * 0.35,
        y + offset + size * 0.65,
        size * 0.3,
        size / 10
    );

    if(ojyaa.showMessage){

        ctx.fillStyle = "black";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";

        ctx.fillText(
            "おじゃあ！",
            x + blockSize / 2,
            y - 10
        );

        ctx.textAlign = "left";

    }

}

function drawOjyaa(){

    drawOneOjyaa(doorOjyaa);
    drawOneOjyaa(leftOjyaa);
    drawOneOjyaa(upperLeftOjyaa);
    drawOneOjyaa(exitOjyaa);

}

function drawEnemy(){

    for(let i = 0; i < enemies.length; i++){
        let enemy = enemies[i];

        ctx.fillStyle = enemy.color;

        ctx.fillRect(
            enemy.col * blockSize,
            enemy.row * blockSize + GAME_Y,
            blockSize,
            blockSize
        );

        drawFingers(
                enemy.fingers,
                enemy.col * blockSize,
                enemy.row * blockSize + blockSize / 2 + GAME_Y
            );
    }

}

const message = document.getElementById("message");

function drawMessage(){

    if(gameState === "gameOver"){

        message.textContent = "💀ゲームオーバー";
    
    }
    else if(gameState === "stageClear"){

        message.textContent = "🎉STAGE CLEAR！";
    
    }
    else if(gameState === "gameClear"){

        message.textContent = "🏆ゲームクリア！";
    
    }
    else{
        
        message.textContent = "";
    
    }
}

function drawUI(){

    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";

    ctx.fillText(
        "STAGE " + (currentStage + 1),
        20,
        100
    );
    
    if(player.knockingDoor === null){

        ctx.fillText(
            player.fingers,
            180,
            100
        );
    }
    else{
        ctx.fillText(
            player.fingers + player.knockingDoor.fingers,
            180,
            100
        );

    }
    
}

function draw(){

    if(gameState === "title"){

    drawTitleScreen();
    return;

}

    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawBackground();

    drawTitle();

    drawPanel();

    drawMap();
    drawObject();
    drawPlayer();
    drawOjyaa();
    drawEnemy();
    
    drawMessage();
    drawUI();

}

function gameLoop(){

    if(gameState === "title"){

        if(keys[" "]){
            gameState = "playing";
            keys[" "] = false;
        }

        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    if(gameState === "stageClear"){

        if(keys[" "]){
            nextStage();
            keys[" "] = false;
        }

    draw();
    requestAnimationFrame(gameLoop);
    return;
    }

    if(gameState === "gameClear"){

        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    if(gameState === "playing"){
        movePlayer();
        moveEnemy();
        checkObjectHit();
        checkKnockingDoor();
        checkOjyaa();
        checkGameOver();
        checkEnemyHit();
        updateOjyaa();
    }
        
    draw();

    if(keys["r"] && gameState !== "playing"){
        resetGame();
    }

    requestAnimationFrame(gameLoop);
}

loadStage();
gameLoop();