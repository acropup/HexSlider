var lcanvas;
var rcanvas;
var lctx;
var rctx;

var r = 500; //inscribed radius
var s = r * Math.tan(Math.PI/6); //half of a side length
var e = 100; //triangle edge length;

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
    "use strict";
    lcanvas = document.getElementById("left");
    rcanvas = document.getElementById("right");
    lctx = lcanvas.getContext("2d");
    rctx = rcanvas.getContext("2d");

    init_player(p1);
    init_player(p2);
    p1.x = 0;
    p1.y = 50;

    onResize();

    requestAnimationFrame(main);
    //renderGame();
}


function init_player(p) {
    "use strict";
    p.x = -50
    p.y = 0
    p.radius = 10;
    p.speed = 0.1;
}

function wrapUniverse(p) {
    var st = Math.sin(Math.PI / 3); //sin theta
    var ct = Math.cos(Math.PI / 3); //cos theta
    var tempx;
    var tempy;
    var i;

    for (i = 0; i < 3; i += 1) {    
        if (p.y > r) {
            p.y -= r * 2;
        } else if (p.y < -r) {
            p.y += r * 2;
        }
        tempx = p.x * ct - p.y * st;
        tempy = p.x * st + p.y * ct;
        p.x = tempx;
        p.y = tempy;
    }
    p.x = -p.x;
    p.y = -p.y;

    renderGame();
}

function setupTransform(x, y, ctx) {
    "use strict";
    //center view
    ctx.scale(1, -1);
    ctx.translate(lcanvas.width / 2, 0);
    ctx.translate(0, -lcanvas.height / 2);

    //offset by playerPos
    ctx.translate(-x, -y);
}

function renderBG(x, y, context) {
    "use strict";
    var a;
    var w;
    context.save()
    context.beginPath()
    for (a = -r; a <= r; a += e) {
        w = (r - Math.abs(a)) / r * s + s;
        context.moveTo(-w, a);
        context.lineTo( w, a);
    }
    context.rotate(Math.PI / 3);
    for (a = -r; a <= r; a += e) {
        w = (r - Math.abs(a)) / r * s + s;
        context.moveTo(-w, a);
        context.lineTo( w, a);
    }
    context.rotate(Math.PI / 3);
    for (a = -r; a <= r; a += e) {
        w = (r - Math.abs(a)) / r * s + s;
        context.moveTo(-w, a);
        context.lineTo( w, a);
    }
    context.stroke();
    context.restore();
}

function renderPlayer(player, context) {
    "use strict";
    context.beginPath()
    context.arc(player.x, player.y, player.radius, 0, 2 * Math.PI, false);
    context.stroke();
}

function renderClear() {
    "use strict";
    lctx.resetTransform();
    rctx.resetTransform();

    lctx.fillStyle = "#CCCCFF";
    lctx.fillRect(0, 0, lcanvas.width, lcanvas.height);
    rctx.fillStyle = "#FFCCCC";
    rctx.fillRect(0, 0, rcanvas.width, rcanvas.height);
}

function renderGame() {
    "use strict";
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

function step() {
    main(time_old + 50);
}

function main(timestamp) {
    "use strict";
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

    wrapUniverse(p1);
    wrapUniverse(p2);

    /*
    if (p1.x > 600) {
        p1.x = -600;
    }
    if (p2.y > 600) {
        p2.y = -600;
    }
    */

    renderGame();
    window.requestAnimationFrame(main);
}