"use strict";

var mousePoint = {};

(function () {
  var game = {}
  game.constants = {}
  game.constants.r = 300;        //inscribed hexagonal playing field radius
  game.constants.e = 100;        //triangle height; should evenly divide `r`
  game.constants.s = game.constants.r * Math.tan(Math.PI/6); //half of a side length (for larger game hexagon)
  game.constants.t = 2*game.constants.s*game.constants.e / game.constants.r;  //triangle edge length
  game.constants.p_default = {}; //player default settings
  game.config = {}
  game.config.tracking = false;  //viewport camera follows the player
  game.config.tiling = false;    //game board appears infinite
  game.config.gameSpeed = 0.1;   //game speed
  game.env = {}
  game.env.lcanvas = null;
  game.env.rcanvas = null;
  game.env.lctx = null;
  game.env.rctx = null;

  game.state = {};
  game.state.phase = 0.0; //phase as in a fraction of the period of a cycle
  game.state.p1 = {};
  game.state.p2 = {};
  game.state.candies = []
  game.state.time_delta = -1;
  game.state.time_old = -1;
  console.log("Initialized");

  //export the game variable
  window.game = game;
}());

var testPoint = new Point(-1000, -1000);

function onResize() {
    "use strict";
    game.env.lcanvas.width = window.innerWidth * 0.48;
    game.env.lcanvas.height = window.innerHeight * 0.96;
    game.env.rcanvas.width = window.innerWidth * 0.48;
    game.env.rcanvas.height = window.innerHeight * 0.96;
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
    game.env.lcanvas = document.getElementById("left");
    game.env.rcanvas = document.getElementById("right");
    game.env.lctx = game.env.lcanvas.getContext("2d");
    game.env.rctx = game.env.rcanvas.getContext("2d");

    game.state.candies.push(new Candy(generate_random_vertex()));
    game.state.candies.push(new Candy(generate_random_vertex()));
    game.state.candies.push(new Candy(generate_random_vertex()));

    game.state.p1 = new Player();
    game.state.p2 = new Player();
    game.constants.p_default = new Player();
    game.state.p2.path = new Line(2 * game.constants.s, 0, 2 * game.constants.s - game.constants.t, 0);
    game.state.p2.nextPath = new Line(2 * game.constants.s - game.constants.t, 0, 2 * game.constants.s - 2 * game.constants.t, 0);
    game.state.p1.path = new Line(-2 * game.constants.s, 0, -2 * game.constants.s + game.constants.t, 0);
    game.state.p1.nextPath = new Line(-2 * game.constants.s + game.constants.t, 0, -2 * game.constants.s + 2 * game.constants.t, 0);

    window.onkeydown = event_keydown;
    window.onmousedown = event_mdown;
    mousePoint = new Point(-1000, -1000);
    onResize();

    requestAnimationFrame(mainloop_init);
}

function Candy(p) {
    this.x = p.x;
    this.y = p.y;
    this.effect = {
        "speedMultiplier": 24,
        "duration": 3
    };
}

function Point(x, y) {
    this.x = x;
    this.y = y;
    this.minus = function(p2) {
        return new Point(this.x - p2.x, this.y - p2.y);
    };
    this.plus = function(p2) {
        return new Point(this.x + p2.x, this.y + p2.y);
    };
    this.scale = function(factor) {
        return new Point(this.x * factor, this.y * factor);
    };
    this.normalize = function() {
        var len = Math.sqrt(this.x * this.x + this.y * this.y);
        return new Point(this.x / len, this.y / len);
    };
    this.toString = function() {
        return "(" + this.x + ", " + this.y + ")";
    };
    this.wrap = function() {
        var st = Math.sin(Math.PI / 3); //sin theta
        var ct = Math.cos(Math.PI / 3); //cos theta
        var tempx;
        var tempy;
        var i;
        var epsilon = 5;

        //Only check in the y direction 'cause it's easy.
        //  rotate by pi/3 rads to align hex edges
        for (i = 0; i < 3; i += 1) {
            if (this.y > game.constants.r + epsilon) {
                this.y -= game.constants.r * 2;
            } else if (this.y < -game.constants.r - epsilon) {
                this.y += game.constants.r * 2;
            }
            tempx = this.x * ct - this.y * st;
            tempy = this.x * st + this.y * ct;
            this.x = tempx;
            this.y = tempy;
        }
        //the points are rotated pi rads now. Rotate them back!
        this.x = -this.x;
        this.y = -this.y;
    };
    this.snap_to_grid = function() {
        var tempy = Math.round(this.y / game.constants.e);
        var tempx = 0;
        if (tempy & 1) {
            tempx = Math.round((this.x - game.constants.t/2) / game.constants.t) * game.constants.t + game.constants.t/2;
        } else {
            tempx = Math.round(this.x / game.constants.t) * game.constants.t;
        }
        tempy = tempy * game.constants.e;
        return new Point(tempx, tempy);
    }
}

function Line(x1, y1, x2, y2) {
    "use strict";
    this.start = new Point(x1, y1);
    this.end = new Point(x2, y2);
    this.length = Math.sqrt(dist_squared(x1, y1, x2, y2));
    this.reverse = function() {
        var temp = this.start;
        this.start = this.end;
        this.end = temp;
    }
    this.toString = function() {
        return this.start.toString() + " -> " + this.end.toString();
    }
    this.wrap = function() {
        var st = Math.sin(Math.PI / 3); //sin theta
        var ct = Math.cos(Math.PI / 3); //cos theta
        var tempx;
        var tempy;
        var i;
        var epsilon = 5;

        //Only check in the y direction 'cause it's easy.
        //  rotate by pi/3 rads to align hex edges
        for (i = 0; i < 3; i += 1) {
            if (this.end.y > game.constants.r + epsilon) {
                this.end.y -= game.constants.r * 2;
                this.start.y -= game.constants.r * 2;
            } else if (this.end.y < -game.constants.r - epsilon) {
                this.end.y += game.constants.r * 2;
                this.start.y += game.constants.r * 2;
            }
            tempx = this.end.x * ct - this.end.y * st;
            tempy = this.end.x * st + this.end.y * ct;
            this.end.x = tempx;
            this.end.y = tempy;
            tempx = this.start.x * ct - this.start.y * st;
            tempy = this.start.x * st + this.start.y * ct;
            this.start.x = tempx;
            this.start.y = tempy;
        }
        //the points are rotated pi rads now. Rotate them back!
        this.end.x = -this.end.x;
        this.end.y = -this.end.y;
        this.start.x = -this.start.x;
        this.start.y = -this.start.y;
    }
}

function Player() {
    "use strict";
    this.pos = 0.5;
    this.radius = 10;
    this.speedMultiplier = 12.0;
    this.speedOffset = 0.0;
    this.path = new Line(-2 * game.constants.s, 0, 2 * game.constants.s, 0);
    this.nextPath = null;
    this.effects = {};
    this.effectsQueue = [];
    this.getPos = function() {
        // start + pos(end - start)
        return this.path.start.plus(this.path.end.minus(this.path.start).scale(this.pos));
    };
    this.setPos = function(newPos) {
        var tempPos = newPos
        tempPos *= this.speedMultiplier;
        tempPos -= this.speedOffset;
        if (tempPos < 0) {
            tempPos += this.speedOffset;
            this.speedOffset = 0;
        } else if (tempPos > 1) {
            this.speedOffset += 1
        }
        this.pos = tempPos;
    }
    this.setTurn = function(direction) {
        if (direction === "straight") {
            var newEnd = this.path.end.minus(this.path.start).plus(this.path.end);
            newEnd = newEnd.snap_to_grid();
            this.nextPath = new Line(this.path.end.x, this.path.end.y, newEnd.x, newEnd.y);
        } else {
            //find path ray end-start
            var ray = this.path.end.minus(this.path.start);
            //rotate path 2pi/3 rad
            if (direction === "left") {
              var ct = Math.cos(2 * Math.PI/3);
              var st = Math.sin(2 * Math.PI/3);
            } else {
              var ct = Math.cos(-2 * Math.PI/3);
              var st = Math.sin(-2 * Math.PI/3);
            }
            var tempx = ray.x * ct - ray.y * st;
            var tempy = ray.x * st + ray.y * ct;
            ray.x = tempx;
            ray.y = tempy;
            //add ray to path end
            ray = ray.plus(this.path.end);
            //new path is end to ray.
            ray = ray.snap_to_grid();
            this.nextPath = new Line(this.path.end.x, this.path.end.y, ray.x, ray.y);
        }
        this.nextPath.wrap();
    }
}

function setupTransform(player, ctx, canvas, tracking) {
    "use strict";
    //center view
    ctx.scale(1, -1);
    ctx.translate(canvas.width / 2, -canvas.height / 2);

    //track the player
    if (tracking) {
        var pos = player.getPos();
        ctx.translate(-pos.x, -pos.y);
    }
}

function renderClear(env) {
    env.lctx.resetTransform();
    env.rctx.resetTransform();

    env.lctx.fillStyle = "#CCCCFF";
    env.lctx.fillRect(0, 0, env.lcanvas.width, env.lcanvas.height);
    env.rctx.fillStyle = "#FFCCCC";
    env.rctx.fillRect(0, 0, env.rcanvas.width, env.rcanvas.height);
}

function renderBG(context) {
  "use strict";

  var a;
  var w;
  context.save();
  context.beginPath();
  for (a = -game.constants.r; a <= game.constants.r; a += game.constants.e) {
    w = (game.constants.r - Math.abs(a)) / game.constants.r * game.constants.s + game.constants.s;
    context.moveTo(-w, a);
    context.lineTo( w, a);
  }
  context.rotate(Math.PI / 3);
  for (a = -game.constants.r; a <= game.constants.r; a += game.constants.e) {
    w = (game.constants.r - Math.abs(a)) / game.constants.r * game.constants.s + game.constants.s;
    context.moveTo(-w, a);
    context.lineTo( w, a);
  }
  context.rotate(Math.PI / 3);
  for (a = -game.constants.r; a <= game.constants.r; a += game.constants.e) {
    w = (game.constants.r - Math.abs(a)) / game.constants.r * game.constants.s + game.constants.s;
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

function renderCandies(ctx, candies) {
    ctx.strokeStyle = "#009900";
    candies.forEach(function (candy) {
        ctx.strokeRect(candy.x - 10, candy.y - 10, 20, 20);
    });
}

function renderTiledGame(state, env) {
    const positions =
        [ [0, 0]
        , [0, +2 * game.constants.r]
        , [0, -2 * game.constants.r]
        , [-3 * game.constants.s, game.constants.r]
        , [+3 * game.constants.s, game.constants.r]
        , [-3 * game.constants.s, -game.constants.r]
        , [+3 * game.constants.s, -game.constants.r]
        ]

    renderClear(env);
    setupTransform(state.p1, env.lctx, env.lcanvas, game.config.tracking);
    setupTransform(state.p2, env.rctx, env.lcanvas, game.config.tracking);

    positions.forEach(function (pos) {
        env.lctx.save();
        env.rctx.save();
        env.lctx.translate(pos[0], pos[1]);
        env.rctx.translate(pos[0], pos[1]);

        env.lctx.lineWidth = 1;
        env.lctx.strokeStyle = "#000000";
        renderBG(env.lctx);
        env.lctx.lineWidth = 5;
        env.lctx.strokeStyle = "#FF0000";
        renderPlayer(state.p2, env.lctx);
        env.lctx.strokeStyle = "#0000FF";
        renderPlayer(state.p1, env.lctx);
        renderCandies(env.lctx, state.candies)


        env.rctx.lineWidth = 1;
        env.rctx.strokeStyle = "#000000";
        renderBG(env.rctx);
        env.rctx.lineWidth = 5;
        env.rctx.strokeStyle = "#0000FF";
        renderPlayer(state.p1, env.rctx);
        env.rctx.strokeStyle = "#FF0000";
        renderPlayer(state.p2, env.rctx);
        renderCandies(env.lctx, state.candies)

        env.lctx.restore();
        env.rctx.restore();
    });

    env.lctx.lineWidth = 5;
    env.rctx.lineWidth = 5;
    env.lctx.strokeStyle = "#00FF00";
    env.rctx.strokeStyle = "#00FF00";
    env.lctx.strokeRect(mousePoint.x - 10, mousePoint.y - 10, 20, 20);
    env.rctx.strokeRect(mousePoint.x - 10, mousePoint.y - 10, 20, 20);
}

function renderGame(state, env) {
    "use strict";
    renderClear(env);
    setupTransform(state.p1, env.lctx, env.lcanvas, game.config.tracking);
    setupTransform(state.p2, env.rctx, env.rcanvas, game.config.tracking);

    env.lctx.lineWidth = 1;
    env.lctx.strokeStyle = "#000000";
    renderBG(env.lctx);
    env.lctx.lineWidth = 5;
    env.lctx.strokeStyle = "#FF0000";
    renderPlayer(state.p2, env.lctx);
    env.lctx.strokeStyle = "#0000FF";
    renderPlayer(state.p1, env.lctx);
    renderCandies(env.lctx, state.candies);

    env.rctx.lineWidth = 1;
    env.rctx.strokeStyle = "#000000";
    renderBG(env.rctx);
    env.rctx.lineWidth = 5;
    env.rctx.strokeStyle = "#0000FF";
    renderPlayer(state.p1, env.rctx);
    env.rctx.strokeStyle = "#FF0000";
    renderPlayer(state.p2, env.rctx);
    renderCandies(env.rctx, state.candies);

    env.lctx.lineWidth = 5;
    env.rctx.lineWidth = 5;
    env.lctx.strokeStyle = "#00FF00";
    env.rctx.strokeStyle = "#00FF00";
    env.lctx.strokeRect(mousePoint.x - 10, mousePoint.y - 10, 20, 20);
    env.rctx.strokeRect(mousePoint.x - 10, mousePoint.y - 10, 20, 20);
}

function mouseEvent_to_world(mouseEvent, canvas) {
    var y = canvas.height / 2 - mouseEvent.offsetY;
    var x = mouseEvent.offsetX - canvas.width / 2;
    return new Point(x, y);
}

function event_keydown(event) {
    //`t` toggles view tracking
    if (event.keyCode === 84) {
        game.config.tracking = !game.config.tracking;
    }
    //`y` toggles world tiling
    else if (event.keyCode === 89) {
        game.config.tiling = !game.config.tiling;
    }

    //p1 turns left by pressing 'a'
    else if (event.keyCode === 65) {
        game.state.p1.setTurn("left");
    }
    //p1 turns right by pressing 'd'
    else if (event.keyCode === 68) {
        game.state.p1.setTurn("right");
    }
    //p1 goes straight by pressing 'w'
    else if (event.keyCode === 87) {
        game.state.p1.setTurn("straight");
    }
    //p2 turns left by pressing <left-arrow>
    else if (event.keyCode === 37) {
        game.state.p2.setTurn("left");
    }
    //p2 turns right by pressing <right-arrow>
    else if (event.keyCode === 39) {
        game.state.p2.setTurn("right");
    }
    //p2 goes straight by pressing <up-arrow>
    else if (event.keyCode === 38) {
        game.state.p1.setTurn("straight");
    }
}

function event_mdown(mouseEvent) {
  mousePoint = mouseEvent_to_world(mouseEvent, game.env.rcanvas);
  if (game.config.tracking) {
    if (mouseEvent.clientX >= game.env.rcanvas.offsetLeft) {
      mousePoint = mousePoint.plus(game.state.p2.getPos());
    } else {
      mousePoint = mousePoint.plus(game.state.p1.getPos());
    }
  }
  mousePoint = mousePoint.snap_to_grid();
}

function generate_random_vertex() {
    var vtx = new Point(Math.random() * game.constants.r * 2, Math.random() * game.constants.r * 2);
    vtx = vtx.snap_to_grid();
    vtx.wrap();
    return vtx;
}

function update_player(player) {
    if (player.pos < 1) {
        return;
    }

    player.pos -= 1;
    player.path = player.nextPath;
    var newstart = player.path.end;
    var newend = player.path.end.minus(player.path.start).plus(player.path.end);
    newend = newend.snap_to_grid();
    player.nextPath = new Line(newstart.x, newstart.y, newend.x, newend.y);
    player.nextPath.wrap();

    Object.keys(player.effects).forEach(function (effect) {
        //effect is a key in the player.effects dictionary
        player.effects[effect] -= 1;
        if (player.effects[effect] <= 0) {

            //corner case?
            if (effect === "speedMultiplier") {
                player.speedOffset = player.speedOffset * game.constants.p_default.speedMultiplier / player.speedMultiplier;
            }

            delete player.effects[effect];
            player[effect] = game.constants.p_default[effect];
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
            player.speedOffset = player.speedOffset * player.speedMultiplier / game.constants.p_default.speedMultiplier;
        }
    });
    player.effectsQueue = [];
}

function dist_squared(p1, p2) {
  return (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
}

function collide_candies(state) {
  var pos1 = state.p1.getPos();
  var pos2 = state.p2.getPos();
  var candies = state.candies.filter(function (candy) {
    if (dist_squared(pos1, candy) < 100) {
      state.p1.effectsQueue.push(candy.effect);
      return false;
    }
    if (dist_squared(pos2, candy) < 100) {
      state.p2.effectsQueue.push(candy.effect);
      return false;
    }
    return true;
  });
  state.candies = candies;
}

function physics(state) {
    "use strict";
    state.phase += game.config.gameSpeed * state.time_delta / 1000;
    state.p1.setPos(state.phase);
    state.p2.setPos(state.phase);
    while (state.phase > 1) {
        state.phase -= 1;
    }

    collide_candies(state);

    update_player(state.p1);
    update_player(state.p2);
}

function mainloop_init(timestamp) {
    game.state.time_old = timestamp;
    window.requestAnimationFrame(mainloop);
}

function mainloop(timestamp) {
    "use strict";
    game.state.time_delta = timestamp - game.state.time_old;
    game.state.time_old = timestamp;

    physics(game.state);

    if (game.config.tiling) {
        renderTiledGame(game.state, game.env);
    } else {
        renderGame(game.state, game.env);
    }
    window.requestAnimationFrame(mainloop);
}
