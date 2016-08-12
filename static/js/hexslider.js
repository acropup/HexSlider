var lcanvas;
var rcanvas;
var lctx;
var rctx;

var time_old = -1;

var p1 = {};
var p2 = {};

function onResize() {
    "use strict";
    lcanvas.width = window.innerWidth * 0.48;
    lcanvas.height = window.innerHeight * 0.96;
    rcanvas.width = window.innerWidth * 0.48;
    rcanvas.height = window.innerHeight * 0.96;
}

(function () {
    "use strict";
    var throttle = function (type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function () {
            if (running) {
                return;
            }
            running = true;
             requestAnimationFrame(function () {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        obj.addEventListener(type, func);
    };

    /* init - you can init any event */
    throttle("resize", "optimizedResize");
}());

// handle event
window.addEventListener("optimizedResize", onResize);


function init() {
    lcanvas = document.getElementById("left");
    rcanvas = document.getElementById("right");
    lctx = lcanvas.getContext("2d");
    rctx = rcanvas.getContext("2d");

    init_player(p1);
    init_player(p2);
    p1.x = 0

    onResize();

    requestAnimationFrame(main);
}


function init_player(p) {
    p.x = -50
    p.y = 0
    p.radius = 10;
    p.speed = 0.1;
}


function renderBG(x, y, context) {
    var a;
    context.beginPath()
    for (a = -500; a <= 500; a += 50) {
        context.moveTo(-500, a);
        context.lineTo( 500, a);
        context.moveTo(a, -500);
        context.lineTo(a,  500);
    }
    context.stroke();
}

function renderPlayer(player, context) {
    context.beginPath()
    context.arc(player.x, player.y, player.radius, 0, 2 * Math.PI, false);
    context.stroke();
}

function renderClear() {
    lctx.resetTransform();
    rctx.resetTransform();

    lctx.fillStyle = "#CCCCFF";
    lctx.fillRect(0, 0, lcanvas.width, lcanvas.height);
    rctx.fillStyle = "#FFCCCC";
    rctx.fillRect(0, 0, rcanvas.width, rcanvas.height);
}

function setupTransform(x, y, ctx) {
    //center view
    ctx.scale(1, -1);
    ctx.translate(lcanvas.width / 2, 0);
    ctx.translate(0, -lcanvas.height / 2);

    //offset by playerPos
    ctx.translate(-x, -y);
}

function renderGame() {
    renderClear();
    setupTransform(p1.x, p1.y, lctx);
    setupTransform(p2.x, p2.y, rctx);

    lctx.lineWidth = 1;
    lctx.strokeStyle = "#000000";
    renderBG(p1.x, p1.y, lctx);
    rctx.lineWidth = 1;
    rctx.strokeStyle = "#000000";
    renderBG(p2.x, p2.y, rctx);


    lctx.lineWidth = 5;
    lctx.strokeStyle = "#FF0000";
    renderPlayer(p2, lctx);
    lctx.strokeStyle = "#0000FF";
    renderPlayer(p1, lctx);

    rctx.lineWidth = 5;
    rctx.strokeStyle = "#0000FF";
    renderPlayer(p1, rctx);
    rctx.strokeStyle = "#FF0000";
    renderPlayer(p2, rctx);
}

function main(timestamp) {
    if (time_old === -1) {
        console.log("resetting time_old");
        time_old = timestamp;
        window.requestAnimationFrame(main);
        return;
    }
    var delta = timestamp - time_old;
    time_old = timestamp;

    p1.x += delta * p1.speed;
    p2.y += delta * p2.speed;

    if (p1.x > 500) {
        p1.x -= 1000;
    }
    if (p2.y > 500) {
        p2.y -= 1000;
    }
    renderGame();
    window.requestAnimationFrame(main);
}