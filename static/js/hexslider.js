var lcanvas;
var rcanvas;
var lctx;
var rctx;

const r = 300; //inscribed hexagonal playing field radius
const e = 100; //triangle height; should evenly divide `r`
               //note: this is not triangle edge length.
const s = r * Math.tan(Math.PI/6); //half of a side length (for larger game hexagon)
const t = 2*s*e / r; //triangle edge length

var tracking = true;
var tiling = true;

var time_old = -1;

var p1 = {};
var p2 = {};
var pos = 0.0;
var speed = 1.0;

var testPoint = new Point(-1000, -1000);

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
    p2.path = new Line(2 * s, 0, 2 * s - t, 0);
    p2.nextPath = new Line(2 * s - t, 0, 2 * s - 2 * t, 0);
    p1.path = new Line(-2 * s, 0, -2 * s + t, 0);
    p1.nextPath = new Line(-2 * s + t, 0, -2 * s + 2 * t, 0);

    window.onkeydown = event_keydown;
    window.onmousedown = event_mdown;

    onResize();

    requestAnimationFrame(mainloop_init);
}

function init_board() {
    //   2  1
    //   \  /
    // 3 -  - 0
    //   /  \
    //   4  5
    board = [];
    rows = []
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
    this.length = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
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
    this.path = new Line(-2 * s, 0, 2 * s, 0);
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
    if (tracking) {
        var pos = player.getPos();
        ctx.translate(-pos.x, -pos.y);
    }
}

function renderBG(context) {
    "use strict";

    var a;
    var w;
    context.save();
    context.beginPath();
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

function renderTiledGame() {
    const positions = 
        [ [0, 0]
        , [0, +2 * r]
        , [0, -2 * r]
        , [-3 * s, r]
        , [+3 * s, r]
        , [-3 * s, -r]
        , [+3 * s, -r]
        ]

    renderClear();
    setupTransform(p1, lctx);
    setupTransform(p2, rctx);

    positions.forEach(function (pos) {
        lctx.save();
        rctx.save();
        lctx.translate(pos[0], pos[1]);
        rctx.translate(pos[0], pos[1]);

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

        lctx.restore();
        rctx.restore();
    });

    lctx.lineWidth = 5;
    rctx.lineWidth = 5;
    lctx.strokeStyle = "#009900";
    rctx.strokeStyle = "#009900";
    lctx.strokeRect(testPoint.x - 10, testPoint.y - 10, 20, 20);
    rctx.strokeRect(testPoint.x - 10, testPoint.y - 10, 20, 20);
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

    lctx.strokeStyle = "#009900";
    rctx.strokeStyle = "#009900";
    lctx.strokeRect(testPoint.x - 10, testPoint.y - 10, 20, 20);
    rctx.strokeRect(testPoint.x - 10, testPoint.y - 10, 20, 20);
}

function step(time = 50) {
    main(time_old + time);
}

function mouseEvent_to_world(mouseEvent, canvas) {
    var y = canvas.height / 2 - mouseEvent.offsetY;
    var x = mouseEvent.offsetX - canvas.width / 2;
    return new Point(x, y);
}

function snap_to_hex_grid(point) {
    var temp = Math.round(point.y / e);
    point.y = temp * e;
    if (temp & 1) {
        point.x = Math.round((point.x - t/2) / t) * t + t/2;
    } else {
        point.x = Math.round(point.x / t) * t;
    }
}

function event_mdown(mouseEvent) {
    testPoint = mouseEvent_to_world(mouseEvent, rcanvas);
    if (tracking) {
        if (mouseEvent.clientX >= rcanvas.offsetLeft) {
            testPoint = testPoint.plus(p2.getPos());
        } else {
            testPoint = testPoint.plus(p1.getPos());
        }
    }
    snap_to_hex_grid(testPoint);
}

function event_keydown(event) {
    "use strict";

    //`t` toggles view tracking
    if (event.keyCode === 84) {
        tracking = !tracking;
    }
    //`y` toggles world tiling
    if (event.keyCode === 89) {
        tiling = !tiling;
    }

    //a=65; d=68; <=37; >=39;
    //p1 turns left by pressing 'a'

    else if (event.keyCode === 65) {
        //find path ray end-start
        var ray = p1.path.end.minus(p1.path.start);
        //rotate path 2pi/3 rad
        var ct = Math.cos(2 * Math.PI/3);
        var st = Math.sin(2 * Math.PI/3);
        var tempx = ray.x * ct - ray.y * st;
        var tempy = ray.x * st + ray.y * ct;
        ray.x = tempx;
        ray.y = tempy;
        //add ray to path end
        ray = ray.plus(p1.path.end);
        //new path is end to ray.
        snap_to_hex_grid(ray);
        p1.nextPath = new Line(p1.path.end.x, p1.path.end.y, ray.x, ray.y);
        wrap(p1.nextPath);
    }
    //p1 turns right by pressing 'd'
    else if (event.keyCode === 68) {
        //find path ray end-start
        var ray = p1.path.end.minus(p1.path.start);
        //rotate path 2pi/3 rad
        var ct = Math.cos(-2 * Math.PI/3);
        var st = Math.sin(-2 * Math.PI/3);
        var tempx = ray.x * ct - ray.y * st;
        var tempy = ray.x * st + ray.y * ct;
        ray.x = tempx;
        ray.y = tempy;
        //add ray to path end
        ray = ray.plus(p1.path.end);
        //new path is end to ray.
        snap_to_hex_grid(ray);
        p1.nextPath = new Line(p1.path.end.x, p1.path.end.y, ray.x, ray.y);
        wrap(p1.nextPath);
    }
    //p2 turns left by pressing <left-arrow>
    else if (event.keyCode === 37) {
        //find path ray end-start
        var ray = p2.path.end.minus(p2.path.start);
        //rotate path 2pi/3 rad
        var ct = Math.cos(2 * Math.PI/3);
        var st = Math.sin(2 * Math.PI/3);
        var tempx = ray.x * ct - ray.y * st;
        var tempy = ray.x * st + ray.y * ct;
        ray.x = tempx;
        ray.y = tempy;
        //add ray to path end
        ray = ray.plus(p2.path.end);
        //new path is end to ray.
        snap_to_hex_grid(ray);
        p2.nextPath = new Line(p2.path.end.x, p2.path.end.y, ray.x, ray.y);
        wrap(p2.nextPath);
    }
    //p2 turns right by pressing <right-arrow>
    else if (event.keyCode === 39) {
        //find path ray end-start
        var ray = p2.path.end.minus(p2.path.start);
        //rotate path 2pi/3 rad
        var ct = Math.cos(-2 * Math.PI/3);
        var st = Math.sin(-2 * Math.PI/3);
        var tempx = ray.x * ct - ray.y * st;
        var tempy = ray.x * st + ray.y * ct;
        ray.x = tempx;
        ray.y = tempy;
        //add ray to path end
        ray = ray.plus(p2.path.end);
        //new path is end to ray.
        snap_to_hex_grid(ray);
        p2.nextPath = new Line(p2.path.end.x, p2.path.end.y, ray.x, ray.y);
        wrap(p2.nextPath);
    }
}

function wrap(path) {
    var st = Math.sin(Math.PI / 3); //sin theta
    var ct = Math.cos(Math.PI / 3); //cos theta
    var tempx;
    var tempy;
    var i;
    var epsilon = 5;
    
    //Only check in the y direction 'cause it's easy.
    //  rotate by pi/3 rads to align hex edges
    for (i = 0; i < 3; i += 1) {    
        if (path.end.y > r + epsilon) {
            path.end.y -= r * 2;
            path.start.y -= r * 2;
        } else if (path.end.y < -r - epsilon) {
            path.end.y += r * 2;
            path.start.y += r * 2;
        }
        tempx = path.end.x * ct - path.end.y * st;
        tempy = path.end.x * st + path.end.y * ct;
        path.end.x = tempx;
        path.end.y = tempy;
        tempx = path.start.x * ct - path.start.y * st;
        tempy = path.start.x * st + path.start.y * ct;
        path.start.x = tempx;
        path.start.y = tempy;
    }
    //the points are rotated pi rads now. Rotate them back!
    path.end.x = -path.end.x;
    path.end.y = -path.end.y;
    path.start.x = -path.start.x;
    path.start.y = -path.start.y;
}

function slide_player(player, delta) {
    if (player.pos < 1) {
        return;
    }

    player.pos -= 1;
    player.path = player.nextPath;
    newstart = player.path.end;
    newend = player.path.end.minus(player.path.start).plus(player.path.end);
    snap_to_hex_grid(newend);
    player.nextPath = new Line(newstart.x, newstart.y, newend.x, newend.y);
    wrap(player.nextPath);
}

function physics(delta) {
    "use strict";
    pos += speed * delta / 1000;
    p1.pos = pos;
    p2.pos = pos;
    while (pos > 1) {
        pos -= 1;
    }

    slide_player(p1, delta);
    slide_player(p2, delta);
}

function mainloop_init(timestamp) {
    time_old = timestamp;
    window.requestAnimationFrame(mainloop);
}

function mainloop(timestamp) {
    "use strict";
    var delta = timestamp - time_old;
    time_old = timestamp;

    physics(delta);

    if (tiling) {
        renderTiledGame();
    } else {
        renderGame();
    }
    window.requestAnimationFrame(mainloop);
}