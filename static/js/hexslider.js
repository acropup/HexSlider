/* Ideas/questions/notes/plans:
S Why not "use strict" at the top of file and be done with it?
S Idea: Convert internal representation of nodes to a standard integer grid, 
        and have a function that maps grid points (scale + translate) to the
        tiled triangular grid for rendering.
S Idea re walls:
    Player does not "turn", player creates wall at vertex and bounces off of it.
    Walls should not last forever.
    Walls influence all players that run into them.
    Checking for collision at vertex allows us to drop the whole player.nextPath concept.
S Maybe change global e (triangle height) to actually represent triangle edge length. Thoughts?

*/

var lcanvas;
var rcanvas;
var lctx;
var rctx;

const r = 300; //circumscribed hexagonal playing field radius (distance from center to middle of edge, not center to corner)
const e = 100; //triangle height; should evenly divide `r`
               //note: this is not triangle edge length.
const s = r * Math.tan(Math.PI/6); //half of a side length (for larger game hexagon)
const t = 2*s*e / r; //triangle edge length

var tracking = false;
var tiling = false;

var time_old = -1;

var p1 = {};
var p2 = {};
var p_default = {};
var g_pos = 0.0;
var gameSpeed = 0.1;

var testPoint = new Point(-1000, -1000);

var candies = [];
var walls = [];

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

    candies.push(new Candy(generate_random_vertex()));
    candies.push(new Candy(generate_random_vertex()));
    candies.push(new Candy(generate_random_vertex()));

    p1 = new Player();
    p1.keyLeft = 65;  //a=65; d=68;
    p1.keyRight = 68;
    p2 = new Player();
    p2.keyLeft = 37;  //<=37; >=39;
    p2.keyRight = 39;
    p_default = new Player();
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
    //  2    1
    //   \  /
    // 3 -  - 0
    //   /  \
    //  4    5
    board = [];
    rows = [];
}
function Candy(p) {
    this.x = p.x;
    this.y = p.y;
    this.effect = {
        "speedMultiplier": 24,
        "duration": 3
    };
}

function Wall(pos, orient, size) {
    //Size param is optional
    this.x = pos.x;
    this.y = pos.y;
    this.orientation = orient; //Should be 0-2... 0: --, 1: /, 2: \ .
    this.maxSize = size || t/6;
    //this.ttl = 1000;
}
Wall.prototype.ttl = 1000; //ttl is decremented over time for each Wall
Wall.prototype.tIn = 50;
Wall.prototype.tOut = 250;

function update_walls(dt) {
    var i = walls.length;
    while (i--) {
        var w = walls[i]
        w.ttl -= dt;
        if (w.ttl <= 0) { //TTL expired
            //Replace current wall with last wall, and shrink array by 1 element
            walls[i] = walls[walls.length - 1];
            walls.length--;
        }
        
    }
}
        
function renderWalls(context) {
    var xCoef = Math.cos(Math.PI/3); //coef for x-component when wall on an angle
    var yCoef = Math.sin(Math.PI/3);
    context.lineWidth = 4;
    context.strokeStyle = "#000000";
    context.beginPath();
    walls.forEach(function (wall) {
        var hl = wall.maxSize; //half-length of wall
        //Fade in/out based on ttl
        if (wall.ttl > (Wall.prototype.ttl - wall.tIn)) {
            hl *= (Wall.prototype.ttl - wall.ttl) / wall.tIn;
        } else if (wall.ttl < wall.tOut) {
            hl *= wall.ttl / wall.tOut;
        }
        var hlx = hl * xCoef;  //half-length x when wall on an angle
        var hly = hl * yCoef;
        switch(wall.orientation) {
            case 0: //Horizontal Wall
                context.moveTo(wall.x-hl, wall.y);
                context.lineTo(wall.x+hl, wall.y);
                break;
            case 1: //Forwardslash Wall
                context.moveTo(wall.x-hlx, wall.y-hly);
                context.lineTo(wall.x+hlx, wall.y+hly);
                break;
            case 2: //Backslash Wall
                context.moveTo(wall.x-hlx, wall.y+hly);
                context.lineTo(wall.x+hlx, wall.y-hly);
                break;
        }
    });
    context.stroke();
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
    this.lerp = function(p2, percent) {
        return new Point(this.x + percent * (p2.x - this.x),
                        this.y + percent * (p2.y - this.y));
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
    this.lerp = function(percent) {
        return this.start.lerp(this.end, percent);
    }
    this.toString = function() {
        return this.start.toString() + " -> " + this.end.toString();
    }
}

function Player() {
    "use strict";
    this.pos = 0.5;
    this.radius = 10;
    this.keyLeft;
    this.keyRight;
    this.speedMultiplier = 12.0;
    this.speedOffset = 0.0;
    this.path = new Line(-2 * s, 0, 2 * s, 0);
    this.nextPath = null;
    this.effects = {};
    this.effectsQueue = [];
    this.getPos = function() { //@Rename to getCoords? Player pos is percent along line
        return this.path.lerp(this.pos);
    };
    this.setPos = function(newPos) {
        var tempPos = newPos;
        tempPos *= this.speedMultiplier;
        tempPos -= this.speedOffset;
        if (tempPos < 0) {
            tempPos += this.speedOffset;
            this.speedOffset = 0;
        } else if (tempPos > 1) {
            this.speedOffset += 1;
        }
        this.pos = tempPos;
    };
    this.keyPress = function(key) {
        var direction = 0;
        if (key === this.keyLeft) direction = 1;
        if (key === this.keyRight) direction = -1;
        if (!direction) return false; //Keypress not handled
        
        //find path ray end-start
        var ray = this.path.end.minus(this.path.start);
        //rotate path 2pi/3 rad
        var angle = direction * 2 * Math.PI/3;
        var ct = Math.cos(angle);
        var st = Math.sin(angle);
        var tempx = ray.x * ct - ray.y * st;
        var tempy = ray.x * st + ray.y * ct;
        ray.x = tempx;
        ray.y = tempy;
        //add ray to path end
        ray = ray.plus(this.path.end);
        //new path is end to ray.
        snap_to_tri_grid(ray);
        this.nextPath = new Line(this.path.end.x, this.path.end.y, ray.x, ray.y);
        wrap_path(this.nextPath);
        
        //Path angle is either +1 to left or -1 to right. +2 is like -1 but without risk of going negative
        var pa = (getPathAngle(this.path) + ((direction == 1) ? 1 : 2)) % 3;
        walls.push(new Wall(this.path.end, pa));
        
        return true; //Keypress handled
    };
    
}

function getPathAngleIgnoreDirection(line) {
    "use strict";
    var result = getPathAngle(line);
    return (result > 2) ? result - 3 : result;
}

function getPathAngle(line) {
    "use strict";
    //  2    1
    //   \  /
    // 3 -  - 0
    //   /  \
    //  4    5
    var dx = line.end.x - line.start.x;
    var dy = line.end.y - line.start.y;
    if (dy > -0.0001 && dy < 0.0001){//dy == 0) {    //Horizontal Line
        if (dx > 0) return 0; //going right
        if (dx > 0) return 0; //going right
        else        return 3; //going left
    } else {          //Angled Line
        if (dx > 0) {
            if (dy > 0) return 1;
            else        return 5;
        } else {
            if (dy > 0) return 2;
            else        return 4;
        }
    }
}    

function setupTransform(player, ctx) {
    "use strict";
    //center view
    ctx.scale(1, -1);
    ctx.translate(lcanvas.width / 2, -lcanvas.height / 2); //ok because lcanvas and rcanvas dimensions are equal

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
    //draw horizontal lines
    for (a = -r; a <= r; a += e) {
        w = (r - Math.abs(a)) / r * s + s;
        context.moveTo(-w, a);
        context.lineTo( w, a);
    }
    context.rotate(Math.PI / 3);
    //draw horizontal lines
    for (a = -r; a <= r; a += e) {
        w = (r - Math.abs(a)) / r * s + s;
        context.moveTo(-w, a);
        context.lineTo( w, a);
    }
    context.rotate(Math.PI / 3);
    //draw horizontal lines
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
    context.beginPath();
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
        ];

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

function renderCandies(ctx) {
    ctx.strokeStyle = "#009900";
    candies.forEach(function (candy) {
        ctx.strokeRect(candy.x - 10, candy.y - 10, 20, 20);
    });
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

    renderCandies(rctx);
    renderCandies(lctx);
    renderWalls(rctx);
    renderWalls(lctx);
}

function step(time = 50) {
    main(time_old + time);
    //blank
}

function mouseEvent_to_world(mouseEvent, canvas) {
    var y = canvas.height / 2 - mouseEvent.offsetY;
    var x = mouseEvent.offsetX - canvas.width / 2;
    return new Point(x, y);
}

function snap_to_tri_grid(point) {
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
    snap_to_tri_grid(testPoint);
}

function event_keydown(event) {
    "use strict";
    var c = String.fromCharCode(event.keyCode);
    console.log('keyCode ' + event.keyCode + ', char ' + c);
    //`t` toggles view tracking
    if (c === 'T') {
        tracking = !tracking;
    }
    //`y` toggles world tiling
    else if (c === 'Y') {
        tiling = !tiling;
    }

    //a=65; d=68; <=37; >=39;
    else if (p1.keyPress(event.keyCode)) {
        log('p1 handled key ' + c);
    }
    else if (p2.keyPress(event.keyCode)) {
        log('p2 handled key ' + c);
    }
}

function wrap_path(path) {
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

	snap_to_tri_grid(path.start);
	snap_to_tri_grid(path.end);
}

function wrap_point(p) {
    var st = Math.sin(Math.PI / 3); //sin theta
    var ct = Math.cos(Math.PI / 3); //cos theta
    var tempx;
    var tempy;
    var i;
    var epsilon = 5;
    
    //Only check in the y direction 'cause it's easy.
    //  rotate by pi/3 rads to align hex edges
    for (i = 0; i < 3; i += 1) {    
        if (p.y > r + epsilon) {
            p.y -= r * 2;
        } else if (p.y < -r - epsilon) {
            p.y += r * 2;
        }
        tempx = p.x * ct - p.y * st;
        tempy = p.x * st + p.y * ct;
        p.x = tempx;
        p.y = tempy;
    }
    //the points are rotated pi rads now. Rotate them back!
    p.x = -p.x;
    p.y = -p.y;
	snap_to_tri_grid(p);
}

function generate_random_vertex() {
    var vtx = new Point(Math.random() * r * 2, Math.random() * r * 2);
    snap_to_tri_grid(vtx);
    wrap_point(vtx);
    return vtx;
}

function update_player(player, delta) {
    if (player.pos < 1) { //Player is still on current line
        return;
    }
	
    // 4 2    1 2
    //    \  /
    //8 3 -  - 0  1
    //    /  \
    //16 4    5 32
	var wallAngles = 0;
	var turnLeft = false;
	var turnRight = false;
	var ignoringParallel = false;
	var pd = getPathAngle(player.path); // player direction
	
	var leftWall = (pd + 1) % 3; //This wall orientation # will bounce player left
	var rightWall = (pd + 2) % 3;
	var parallelWall = pd % 3;
	walls.forEach(function (wall) {
		if (new Line(player.path.end.x, player.path.end.y, wall.x, wall.y).length < 10) {
			var o = wall.orientation;
			turnLeft |= (o == leftWall);
			turnRight|= (o == rightWall);
			ignoringParallel |= (o == parallelWall);
			
		}
	});
	if (turnRight && turnLeft) {
			//Turn around
			log('turn around');
			pd += 3;
	} else if (turnRight) {
		//Turn Right
		log('turn right');
		pd += 4; //Same as -2 in mod 6
	} else if (turnLeft) {
		//Turn Left
		log('turn left');
		pd += 2;
	}
	if (pd >= 6) pd -= 6;
	log('go ' + pd);
	
	if (turnRight ^ turnLeft) {
		//find path ray end-start
		var ray = player.path.end.minus(player.path.start);
		//rotate path 2pi/3 rad
		var angle = 2 * Math.PI/3;
		if (turnRight) angle = -angle;
		var ct = Math.cos(angle);
		var st = Math.sin(angle);
		var tempx = ray.x * ct - ray.y * st;
		var tempy = ray.x * st + ray.y * ct;
		ray.x = tempx;
		ray.y = tempy;
		//add ray to path end
		ray = ray.plus(player.path.end);
		//new path is end to ray.
		snap_to_tri_grid(ray);
		player.path = new Line(player.path.end.x, player.path.end.y, ray.x, ray.y);
		wrap_path(player.path);
		player.nextPath = player.path;
	} else if (turnRight && turnLeft) {
		//Turn around
		var tmp = player.path.start;
		player.path.start = player.path.end;
		player.path.end = tmp;
		player.nextPath = player.path;
	}
	
	//Player has reached (or passed) end vertex
    player.pos -= 1;
    player.path = player.nextPath;
    newstart = player.path.end;
    newend = player.path.end.minus(player.path.start).plus(player.path.end);
    snap_to_tri_grid(newend);
    player.nextPath = new Line(newstart.x, newstart.y, newend.x, newend.y);

    wrap_path(player.nextPath);
    Object.keys(player.effects).forEach(function (effect) {
        //effect is a key in the player.effects dictionary
        player.effects[effect] -= 1;
        if (player.effects[effect] <= 0) {
            
            //corner case?
            if (effect === "speedMultiplier") {
                player.speedOffset = player.speedOffset * p_default.speedMultiplier / player.speedMultiplier;
            }

            delete player.effects[effect];
            player[effect] = p_default[effect];
        }
    });

    player.effectsQueue.forEach(function (effect) {
        //testing:
        var duration = effect.duration;
        delete effect.duration;
        var power = Object.keys(effect)[0];
        var value = effect[power];
        player.effects[power] = duration;
        player[power] = value;

        //corner case?
        if (power === "speedMultiplier") {
            player.speedOffset = player.speedOffset * player.speedMultiplier / p_default.speedMultiplier;
        }
    });
    player.effectsQueue = [];
}

function collide_candies(player) {
    var pos = player.getPos();
    candies = candies.filter(function (candy) {
        if ((pos.x - candy.x) * (pos.x - candy.x) + (pos.y - candy.y) * (pos.y - candy.y) < 5) {
            player.effectsQueue.push(candy.effect);
            return false;
        }
        return true;
    });
}

function physics(delta) {
    "use strict";
    g_pos += gameSpeed * delta / 1000;
    p1.setPos(g_pos);
    p2.setPos(g_pos);
    
    //@Confused What is this for?
    while (g_pos > 1) {
        g_pos -= 1;
    }

    collide_candies(p1);
    collide_candies(p2);

    update_player(p1, delta);
    update_player(p2, delta);
    
    update_walls(delta);
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

function log(str) {
    console.log(str);
}