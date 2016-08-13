var lcanvas;
var rcanvas;
var lctx;
var rctx;

const r = 300; //inscribed radius
const e = 100; //triangle height; should evenly divide `r`
               //note: this is not triangle edge length.
const s = r * Math.tan(Math.PI/6); //half of a side length

var tracking = false;

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
    p1.pos = 0.1;
    p2.pos = 0.1;
    p2.path.reverse();

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
    this.normalize = function() {
        var len = Math.sqrt(this.x * this.x + this.y * this.y);
        return new Point(this.x / len, this.y / len);
    }
    this.toString = function() {
        return "(" + this.x + ", " + this.y + ")";
    }
}

function Line(x1, y1, x2, y2) {
    "use strict";
    this.start = new Point(x1, y1);
    this.end = new Point(x2, y2);
    this.length = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    this.reverse = function() {
        var temp = this.start;
        this.start = this.end;
        this.end = temp;
    }
    this.toString = function() {
        return this.start.toString() + " -> " + this.end.toString();
    }
}

function Player() {
    "use strict";
    this.pos = 0.5;
    this.radius = 10;
    this.speed = 0.1;
    this.path = new Line(-2 * s, 0, 2 * s, 0);
    this.nextTurn = Infinity; 
    this.nextPath = null;
    this.getPos = function(pos) {
        // start + pos(end - start)
        return this.path.start.plus(this.path.end.minus(this.path.start).scale(pos));
    };
}

function setupTransform(player, ctx) {
    "use strict";
    //center view
    ctx.scale(1, -1);
    ctx.translate(lcanvas.width / 2, -lcanvas.height / 2);

    //track the player
    if (tracking) {
        var pos = player.getPos(player.pos);
        ctx.translate(-pos.x, -pos.y);
    }
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
    var pos = player.getPos(player.pos);
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

    //`t` toggles view tracking
    if (event.keyCode === 84) {
        tracking = !tracking;
    }

    //a=65; d=68; <=37; >=39;
    //p1 turns left by pressing 'a'

    else if (event.keyCode === 65) {
        var numSegments = Math.round(p1.path.length / (2 * s / (r / e)));
        var nextIntersection = Math.ceil(p1.pos * numSegments) / numSegments;
        p1.nextTurn = nextIntersection;
        p1.nextPath = calcTurn(p1, nextIntersection, "left");
        p1.nextPos = calcPos(p1, nextIntersection, p1.nextPath);
    }
    //p1 turns right by pressing 'd'
    else if (event.keyCode === 68) {
        var numSegments = Math.round(p1.path.length / (2 * s / (r / e)));
        var nextIntersection = Math.ceil(p1.pos * numSegments) / numSegments;
        p1.nextTurn = nextIntersection;
        p1.nextPath = calcTurn(p1, nextIntersection, "right");
        p1.nextPos = calcPos(p1, nextIntersection, p1.nextPath);
    }
    //p2 turns left by pressing <left-arrow>
    else if (event.keyCode === 37) {
        var numSegments = Math.round(p2.path.length / (2 * s / (r / e)));
        var nextIntersection = Math.ceil(p2.pos * numSegments) / numSegments;
        p2.nextTurn = nextIntersection;
        p2.nextPath = calcTurn(p2, nextIntersection, "left");
        p2.nextPos = calcPos(p2, nextIntersection, p2.nextPath);
    }
    //p2 turns right by pressing <right-arrow>
    else if (event.keyCode === 39) {
        var numSegments = Math.round(p2.path.length / (2 * s / (r / e)));
        var nextIntersection = Math.ceil(p2.pos * numSegments) / numSegments;
        p2.nextTurn = nextIntersection;
        p2.nextPath = calcTurn(p2, nextIntersection, "right");
        p2.nextPos = calcPos(p2, nextIntersection, p2.nextPath);
    }
}

function calcPos(player, pos, path) {
    "use strict";
    var p = player.getPos(pos);
    var vector = path.end.minus(path.start).normalize();
    p = p.minus(path.start);
    var dist = vector.x * p.x + vector.y * p.y;
    return dist / path.length;
}

function calcTurn(player, pos, dir) {
    var p = player.getPos(pos);
    //console.log("----- calc turn -----");
    //console.log("player pos: " + player.pos);
    //console.log("player is turning " + dir);
    //console.log("player is at " + p.toString());

    //Get the normalized direction of motion
    var vector = player.path.end.minus(player.path.start).normalize();
    //console.log("Vector is " + vector.toString());
    //rotate path PI/6 rads
    var ct;
    var st;
    if (dir === "right") {
        ct = Math.cos(-Math.PI/6);
        st = Math.sin(-Math.PI/6);
    } else {
        ct = Math.cos(Math.PI/6);
        st = Math.sin(Math.PI/6);
    }
    var tempx = vector.x * ct - vector.y * st;
    var tempy = vector.x * st + vector.y * ct;
    //console.log("Test direction: (" + tempx + ", " + tempy + ")");
    //do dot product of path vector and p to determine offset. 
    var dist = p.x * tempx + p.y * tempy;
    //console.log("point is " + dist + " pixels in that direction");
    //Round that to the nearest line.
    dist = Math.round(dist / e) * e;
    var w = (r - Math.abs(dist)) / r * s + s;
    var left = new Point(-w, -dist);
    var right = new Point(w, -dist);
    //console.log("new line is " + left.toString() + " -> " + right.toString());
    //Rotate path to final position
    var atan2 = Math.atan2(vector.y, vector.x);
    //console.log("-- vector is " + vector.toString());
    //console.log("-- atan2(vector) is " + atan2)
    //console.log("-- Math.PI/3 is " + Math.PI / 3);
    if (dir === "right") {
        ct = Math.cos(atan2 + Math.PI / 2 - Math.PI/6);
        st = Math.sin(atan2 + Math.PI / 2 - Math.PI/6);
    } else {
        ct = Math.cos(atan2 + Math.PI / 2 + Math.PI/6);
        st = Math.sin(atan2 + Math.PI / 2 + Math.PI/6);
    }
    tempx = left.x * ct - left.y * st;
    tempy = left.x * st + left.y * ct;
    left.x = tempx;
    left.y = tempy;
    tempx = right.x * ct - right.y * st;
    tempy = right.x * st + right.y * ct;
    right.x = tempx;
    right.y = tempy;
    var line = new Line(left.x, left.y, right.x, right.y);
    if (dir === "right") {
        line.reverse();
    }
    //console.log("final line is " + line);
    return line;
}

//this function works for r=200; e=100
function test_turning() {
    "use strict";
    var player = new Player();
    var actual;
    var expected;
    var pass;
    
    actual = calcTurn(player, 0.755, "right");
    expected = new Line(173, 100, 0, -200);
    pass = isalmost(actual, expected);
    console.log("right on horizontal, right turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    actual = calcTurn(player, 0.755, "left");
    expected = new Line(173, -100, 0, 200);
    pass = isalmost(actual, expected);
    console.log("right on horizontal, left turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    player.path.reverse();

    actual = calcTurn(player, 0.755, "right");
    expected = new Line(-173, -100, 0, 200);
    pass = isalmost(actual, expected);
    console.log("left on horizontal, right turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    actual = calcTurn(player, 0.755, "left");
    expected = new Line(-173, 100, 0, -200);
    pass = isalmost(actual, expected);
    console.log("left on horizontal, left turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    player.path = new Line(-s, 200, s, -200);

    actual = calcTurn(player, 0.755, "right");
    expected = new Line(173, -100, -173, -100);
    pass = isalmost(actual, expected);
    console.log("downward on backslash, right turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    actual = calcTurn(player, 0.755, "left");
    expected = new Line(0, -200, 173, 100);
    pass = isalmost(actual, expected);
    console.log("downward on backslash, left turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());

    player.path = new Line(0, -200, s*1.5, 100);

    actual = calcTurn(player, 0.65, "left");
    expected = new Line(2*s, 0, -2*s, 0);
    pass = isalmost(actual, expected);
    console.log("upward on right-shifted once forwardSlash, left turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.tString());

    actual = calcTurn(player, 0.65, "right");
    expected = new Line(0, 200, 1.5*s, -100);
    pass = isalmost(actual, expected);
    console.log("upward on right-shifted once forwardSlash, right turn = " + pass);
    if (!pass) console.log("\texpected: " + expected.toString() + "\n\tgot: " + actual.toString());
}

function isalmost(a, b) {
    var diff = Math.abs(a.start.x - b.start.x) + 
       Math.abs(a.start.y - b.start.y) +
       Math.abs(a.end.x - b.end.x) +
       Math.abs(a.end.y - b.end.y);
    return diff < 5;
}

function physics(delta) {
    "use strict";
    //move forward
    p1.pos += (p1.speed / p1.path.length) * delta;
    p2.pos += (p2.speed / p2.path.length) * delta;

    //turn
    if (p1.pos > p1.nextTurn) {
        p1.path = p1.nextPath;
        p1.pos = p1.nextPos;
        p1.nextPath = null;
        p1.nextTurn = Infinity;
        p1.nextPos = 0;
    }
    if (p2.pos > p2.nextTurn) {
        p2.path = p2.nextPath;
        p2.pos = p2.nextPos;
        p2.nextPath = null;
        p2.nextTurn = Infinity;
        p2.nextPos = 0;
    }

    //loop over lines
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