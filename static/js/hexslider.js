var lcanvas;
var rcanvas;
var lctx;
var rctx;

const r = 200; //inscribed radius
const e = 100; //triangle height; should evenly divide `r`
               //note: this is not triangle edge length.
const s = r * Math.tan(Math.PI/6); //half of a side length

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

    p1 = new Player();
    p2 = new Player();
    p1.pos = 0.3;
    p2.pos = 0.7;

    window.onkeydown = event_keydown;

    onResize();

    requestAnimationFrame(main);
    //renderGame();
}

function Point(x, y) {
    "use strict";
    this.x = x;
    this.y = y;
    this.minus = function(p2) {
        return new Point(this.x - p2.x, this.y - p2.y);
    }
    this.plus = function(p2) {
        return new Point(this.x + p2.x, this.y + p2.y);
    }
    this.scale = function(factor) {
        return new Point(this.x * factor, this.y * factor);
    }
}

function Line(x1, y1, x2, y2) {
    "use strict";
    this.start = new Point(x1, y1);
    this.end = new Point(x2, y2);
    this.length = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}

function Player() {
    "use strict";
    this.pos = 0.5;
    this.radius = 10;
    this.speed = 0.1;
    this.path = new Line(-2 * s, 0, 2 * s, 0);
    this.nextTurn = 2; 
    this.nextPath = null;
    this.getPos = function() {
        // start + pos(end - start)
        return this.path.start.plus(this.path.end.minus(this.path.start).scale(this.pos));
    };
}

function setupTransform(player, ctx) {
    "use strict";
    //center view
    ctx.scale(1, -1);
    ctx.translate(lcanvas.width / 2, -lcanvas.height / 2);

    //track the player
    //var pos = player.getPos();
    //ctx.translate(-pos.x, -pos.y);
}

function renderBG(context) {
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
    var pos = player.getPos();
    context.arc(pos.x, pos.y, player.radius, 0, 2 * Math.PI, false);
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
    setupTransform(p1, lctx);
    setupTransform(p2, rctx);

    lctx.lineWidth = 1;
    lctx.strokeStyle = "#000000";
    renderBG(lctx);
    rctx.lineWidth = 1;
    rctx.strokeStyle = "#000000";
    renderBG(rctx);

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

function step(time = 50) {
    main(time_old + time);
}

function event_keydown(event) {
    "use strict";
    //a=65; d=68; <=37; >=39;
    //p1 turns left by pressing 'a'
    if (event.keyCode === 65) {
        var numSegments = Math.round(p1.path.length / s);
        var nextIntersection = Math.ceil(p1.pos * numSegments) / numSegments;
        p1.nextTurn = nextIntersection;
        p1.nextPath = p1.path;
        p1.nextPos = p1.pos;
    }
    //p1 turns right by pressing 'd'
    if (event.keyCode === 68) {
        var numSegments = Math.round(p1.path.length / s);
        var nextIntersection = Math.ceil(p1.pos * numSegments) / numSegments;
        p1.nextTurn = nextIntersection;
        p1.nextPath = p1.path;
        p1.nextPos = p1.pos;
    }
}

function test_turn() {
    console.log("----- test turn -----");
    var numSegments = Math.round(p1.path.length / s);
    var nextIntersection = Math.ceil(p1.pos * numSegments) / numSegments;
    console.log("p1 pos: " + p1.pos);
    console.log("p1 has " + numSegments + " segments.")
    console.log("p1 will turn at " + nextIntersection + ".");
}

function physics(delta) {
    "use strict";
    //move forward
    p1.pos += (p1.speed / p1.path.length) * delta;
    p2.pos += (p2.speed / p2.path.length) * delta;

    //turn
    if (p1.pos > p1.nextTurn) {
        console.log("turning");
        var overshot = p1.pos - p1.nextTurn;
        p1.path = p1.nextPath;
        p1.pos = p1.nextPos;

        p1.nextPath = null;
        p1.nextTurn = 2;
        p1.nextPos = 0;
    }

    //cheesy wrap around
    p1.pos -= Math.floor(p1.pos);
    p2.pos -= Math.floor(p2.pos);
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

    physics(delta);

    renderGame();
    window.requestAnimationFrame(main);
}