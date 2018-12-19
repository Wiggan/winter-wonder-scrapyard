var http = require('http');
var socket = require('socket.io');
var app = http.createServer();
var io = socket(app);
var selfReloadJSON = require('self-reload-json');
var config = new selfReloadJSON('./config.json');
var chance = require('chance').Chance();
var Level = require('./levelgenerator.js');
var level = new Level();

var Particle = require('./particlegenerator.js');
var particle = new Particle();

var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var lerp = require('vectors/lerp')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var dist = require('vectors/dist')(2);

const math = require('mathjs');

var connectionCount = 0;

var KeyEnum = {
	forward: 87,
	backward: 83,
	left: 65,
	right: 68,
	brake: 32,
	boost: 17,
	fire: 38,
	towerleft: 37,
	towerright: 39
};
Object.freeze(KeyEnum);

io.world = {
	level: {},
	players: [],
	projectiles: [],
	scraps: [],
	rocks: [],
	effects: [],
	ranking: [],
	arena: false,
	gameOn: false,
	physicsOn: true,
};

function getPrerequisiteEdges(id) {
	return config.shop.edges.filter((edge) => { return edge.to === id });
}

function getCurrentShop(player) {
	shop = JSON.parse(JSON.stringify(config.shop));
	shop.nodes.map((node) => { 
		if (player.upgrades.includes(node.id)) {
			node.owned = true;
			node.chosen = false;
		} else if (getPrerequisiteEdges(node.id).every((edge) => player.upgrades.includes(edge.from)) === false) {
			node.chosen = false;
		} else if (player.hud.scrap < node.cost) {
			node.chosen = false;
		}
	});
	return shop;
}

function updateAppearanceDueToKeyEvent(player) {
	if (player.keysDown.includes(KeyEnum.forward)) {
		player.status.driving = 1;
	} else if (player.keysDown.includes(KeyEnum.backward)) {
		player.status.driving = -1;
	} else {
		player.status.driving = 0;
	}
	if (player.keysDown.includes(KeyEnum.left)) {
		player.status.turning = -1;
	} else if (player.keysDown.includes(KeyEnum.right)) {
		player.status.turning = 1;
	} else {
		player.status.turning = 0;
	}
}

function respawnPlayer(player) {
	player.status.pos = level.getCollisionFreePosition();
	player.status.vel = [0, 0];
	player.status.rotation = chance.floating({ min: 0, max: 2*Math.PI });
	player.status.alive = true;
	player.status.health = 100;
}

function doWeHaveAWinner() {
	var winner = undefined;
	Object.values(io.sockets.sockets).map((socket) => {
		if(socket.player.hud.score === 3) {
			winner = socket.player.hud;
		}
	});
	return winner;
}
function startNormalRound() {
	console.log("Starting normal round!");
	io.world.physicsOn = false;
	io.world.arena = false;
	io.world.scraps = [];
	io.world.level = level.generate(800, 600);
	io.emit('new map', JSON.stringify(io.world.level));
	Object.values(io.sockets.sockets).map((socket) => {
		respawnPlayer(socket.player);
	});
	
	io.world.scrapInterval = setInterval(() => {
		if(io.world.scraps.length < 5) {
			io.world.scraps.push({pos: level.getCollisionFreePosition()});
		}
	}, 5000);
	setTimeout(() => {
		io.world.physicsOn = true;
	}, 2000);
	setTimeout(() => {
		startArenaRound();
	}, config.parameters.roundTime);
}

function startArenaRound() {
	console.log("Starting arena!");
	io.world.physicsOn = false;
	io.world.arena = true;
	io.world.scraps = [];
	clearInterval(io.world.scrapInterval);
	io.world.level = level.generate(800, 600);
	io.emit('new map', JSON.stringify(io.world.level));
	Object.values(io.sockets.sockets).map((socket) => {
		respawnPlayer(socket.player);
	});
	io.world.countPlayersAliveInterval = setInterval(() => {
		var alivers = [];
		Object.values(io.sockets.sockets).map((socket) => {
			if(socket.player.status.alive) alivers.push(socket.player.hud);
		});
		if(alivers.length <= 1) {
			clearInterval(io.world.countPlayersAliveInterval);
			if(alivers.length == 1) {
				alivers[0].score++;
				alivers[0].scrap += 5;
				updatePlayerList()
			}
			startNormalRound();
		}
	}, 1000);
	setTimeout(() => {
		io.world.physicsOn = true;
	}, 2000);
}

function updatePlayerList() {
	io.world.ranking = []
	var readyCount = 0;
	Object.values(io.sockets.sockets).map((socket) => {
		io.world.ranking.push(socket.player.hud);
		if(socket.player.hud.ready) readyCount++;
		socket.emit('hud update', JSON.stringify(socket.player.hud));
	});
	io.world.ranking.sort((a, b) => { return a.score > b.score ? -1 : 1; });
	io.emit('score update', JSON.stringify(io.world.ranking));
	
	if(!io.world.gameOn && readyCount === io.world.ranking.length) {
		// Start the game!
		io.world.physicsOn = false;
		io.world.gameOn = true;
		console.log("All are ready, game is starting!");
		Object.values(io.sockets.sockets).map((socket) => {
			socket.player.stats = Object.assign(socket.player.stats, JSON.parse(JSON.stringify(config.player.stats)));
			socket.player.status = Object.assign(socket.player.status, JSON.parse(JSON.stringify(config.player.status)));
			socket.player.hud = Object.assign(socket.player.hud, config.player.hud);
			socket.player.upgrades = [];
			socket.emit('hud update', JSON.stringify(socket.player.hud));
			socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
		});
		
		startNormalRound();
	}
}

io.on('connection', function(socket){
	var playerId = connectionCount++;
	console.log('user ' + playerId + ' connected');
	socket.on('disconnect', function(){
		console.log('user disconnected');
		io.world.players = io.world.players.filter((value) => { return socket.player.status.id !== value.id; });
		updatePlayerList();
	});
	socket.on('get shop', function(){
		socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
	});
	socket.on('ready', function(){
		socket.player.hud.ready = true;
		socket.emit('hud update', JSON.stringify(socket.player.hud));
		updatePlayerList();
	});
	socket.on('buy', function(id){
		var item = config.shop.nodes.find((node) => {return node.id == id});
		socket.player.upgrades.push(item.id);
		switch(item.id) {
			case 1: // Dubbdäck
				socket.player.status.dubbs = true;
				socket.player.status.tiresize = [5, 6];
				socket.player.stats.grip = 0.9;
				break;
			case 2: // Fri Rotation
				socket.player.stats.freeRotataion = true;
				break;
			case 3: // Bättre svängradie
				socket.player.stats.rotationSpeed = 0.02;
				break;
			case 4: // Snabbare motor
				socket.player.stats.acc = 150;
				break;
			case 5: // Turboskjuts
				socket.player.stats.boost = true;
				break;
			case 6: // Spikdäck
				socket.player.status.spikes = true;
				socket.player.status.tiresize = [6, 7];
				socket.player.stats.grip = 2;
				break;
			case 101: // Kofångare
				socket.player.stats.bumper = true;
				socket.player.status.bumper = true;
				break;
			case 201: // Raketgevär
				socket.player.status.rockets = true;
				socket.player.stats.rockets = true;
				break;
			case 202: // Handvetat kanontorn
				socket.player.stats.towerRotation = true;
				break;
			case 203: // Servokanontorn
				socket.player.stats.towerRotationSpeed = 4;
				break;
			case 204: // Trippelraket
				socket.player.status.tripple = true;
				socket.player.stats.tripple = true;
				break;
				
			default:
				break;
		}
		socket.player.hud.scrap = socket.player.hud.scrap - item.cost;
		console.log(item);
		socket.emit('hud update', JSON.stringify(socket.player.hud));
		socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
	});
	socket.on('get hud', function(){
		socket.emit('hud update', JSON.stringify(socket.player.hud));
	});
	socket.on('keydown', function(key){
		switch(key) {
			case KeyEnum.forward:
			case KeyEnum.backward:
			case KeyEnum.left:
			case KeyEnum.right:
			case KeyEnum.brake:
			case KeyEnum.boost:
			case KeyEnum.fire:
			case KeyEnum.towerleft:
			case KeyEnum.towerright:
				socket.player.keysDown.push(key);
				updateAppearanceDueToKeyEvent(socket.player);
			break;
			default:
			break;
		}
	});
	socket.on('keyup', function(key){
		switch(key) {
			case KeyEnum.forward:
			case KeyEnum.backward:
			case KeyEnum.left:
			case KeyEnum.right:
			case KeyEnum.brake:
			case KeyEnum.boost:
			case KeyEnum.fire:
			case KeyEnum.towerleft:
			case KeyEnum.towerright:
				socket.player.keysDown = socket.player.keysDown.filter((value) => { return key !== value; });
				updateAppearanceDueToKeyEvent(socket.player);
			break;
			default:
			break;
		}
	});
	var color = chance.color({format: 'hex'});
	socket.player = {
		keysDown: [],
		status: {
			id: playerId,
			pos: level.getCollisionFreePosition(),
			vel: [0, 0],
			rotation: chance.floating({ min: 0, max: 2*Math.PI }),
			towerrotation: 0,
			turning: 0,
			driving: 0,
			alive: true,
			health: 100,

			size: [14, 20],
			tiresize: [4, 6],
			color: color,
			bumper: false,
			dubbs: false,
			spikes: false,
			rockets: false,
			tripple: false,
		},
		stats: {
			acc: 70,
			friction: 20,
			bumperFactor: 2,
			boostForce: 10000,
			boostCooldownTime: 3000,
			rocketsCooldownTime: 2000,
			rocketSpeed: 400,
			rocketForce: 300,
			brakeFriction: 200,
			grip: 0.8,
			rotationSpeed: 0.007,
			towerRotationSpeed: 1,
			
			bumper: false,
			freeRotataion: false,
			boost: false,
			boostCooldown: false,
			rockets: false,
			rocketsCooldown: false,
			towerRotation: false,
			tripple: false,
		},
		hud: {
			name: chance.prefix({ full: false }) + " " + chance.word({ syllables: 2 }),
			scrap: 10,
			color: color,
			score: 0,
			ready: false,
		},
		upgrades: []
	};
	
	io.world.players.push(socket.player.status);
	socket.emit('new map', JSON.stringify(io.world.level));
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	updatePlayerList();
});

function rad2dir(rad) {
	return [-Math.sin(rad), Math.cos(rad)];
}

function epsilonGuard(number) {
	return (Math.round(( number )*10000))/10000
}

function angle(a, b) {
	var angle = Math.acos(epsilonGuard(dot(a, b) / (mag(a) * mag(b))));
	if(isNaN(angle)) {
		console.log(dot(a, b));
		console.log(epsilonGuard(dot(a, b)));
		
		console.log(mag(a) * mag(b));
		console.log(epsilonGuard(mag(a) * mag(b)));
	}
	return angle;
}

function scalarProjection(a, b) {
	return mag(a)*Math.cos(angle(a, b));
}



app.listen(3000, function(){
    console.log('listening on *:3000');
	io.world.level = level.generate(800, 600);
	io.emit('new map', JSON.stringify(io.world.level));
	
    setInterval(() => {
		var elapsed = 0.016666; // Fix this
		if(io.world.physicsOn) {
			// Collision
			Object.values(io.sockets.sockets).map((socket1) => {
				// fast forward inner loop, to avoid duplicate pairs.
				var ff = false;
				var pos1 = socket1.player.status.pos;
				Object.values(io.sockets.sockets).map((socket2) => {
					if(socket1 == socket2) { ff = true; };
					if(ff) {
						var pos2 = socket2.player.status.pos;
						if (socket1 != socket2 && dist(pos1, pos2) < socket2.player.status.size[0]*2) {
							console.log("Krock!");
							var direction = norm(sub(copy(pos2), pos1));
							var vel1 = copy(socket1.player.status.vel);
							var vel2 = copy(socket2.player.status.vel);
							
							if(mag(vel1) > 0.1) {
								var impact1 = mult(copy(direction), scalarProjection(vel1, copy(direction)));
								sub(socket1.player.status.vel, impact1);
								if(socket1.player.stats.bumper && Math.abs(angle(impact1, rad2dir(socket1.player.status.rotation))) < 0.8) {
									mult(impact1, socket1.player.stats.bumperFactor);
								}
								add(socket2.player.status.vel, impact1);
							}
							if (mag(vel2) > 0.1) {
								var opposite = mult(copy(direction), -1);
								var impact2 = mult(copy(opposite), scalarProjection(vel2, opposite));
								sub(socket2.player.status.vel, impact2);
								if(socket2.player.stats.bumper && Math.abs(angle(impact2, rad2dir(socket2.player.status.rotation))) < 0.8) {
									mult(impact2, socket2.player.stats.bumperFactor);
								}
								add(socket1.player.status.vel, impact2);
							}
							if (mag(vel1) + mag(vel2) > 10) {
								io.world.effects.push(particle.generateSmoke(sub(copy(pos2), mult(copy(direction), socket2.player.status.size[0])), 1));
							}
							
						}
					}
				});
				
				// Collision with rocks
				io.world.level.rocks.map((rock) => {
					var distance = dist(socket1.player.status.pos, rock.pos);
					var radii = socket1.player.status.size[0] + rock.radius;
					if (distance < radii) {
						var direction = norm(sub(copy(socket1.player.status.pos), rock.pos));
						var component = mult(copy(direction), scalarProjection(socket1.player.status.vel, copy(direction))*1.8);
						sub(socket1.player.status.vel, component);
						sub(socket1.player.status.pos, mult(norm(copy(component)), radii - distance));
						if(mag(component) > 100) {
							io.world.effects.push(particle.generateSmoke(add(copy(rock.pos), mult(copy(direction), rock.radius)),mag(component)/300));
							
						}
					}
				});
				
				// Collision with projectiles
				io.world.projectiles.map((projectile) => {
					var pos2 = projectile.pos;
					if (socket1.player.status.id != projectile.owner && dist(pos1, pos2) < socket1.player.status.size[0]) {
						console.log("Träff!");
						var direction = norm(copy(projectile.vel));
						add(socket1.player.status.vel, mult(direction, socket1.player.stats.rocketForce));
						projectile.done = true;
						io.world.effects.push(particle.generateExplosion(projectile.pos));
					}
				});
				
				// Collision with scrap
				io.world.scraps.map((scrap) => {
					var pos2 = scrap.pos;
					if (dist(pos1, pos2) < socket1.player.status.size[0]) {
						socket1.player.hud.scrap++;
						socket1.emit('hud update', JSON.stringify(socket1.player.hud));
						socket1.emit('get shop', JSON.stringify(getCurrentShop(socket1.player)));
						scrap.done = true;
					}
				});
				
				
			});
			
			io.world.projectiles.map((projectile) => {
				add(projectile.pos, mult(copy(projectile.vel), elapsed));
				if (mag(projectile.pos) > 2000) {
					projectile.done = true;
				}
			});
			
			
			
			Object.values(io.sockets.sockets).map((socket) => {
					if(socket.player.status.alive) {
					// Get forward and sideway velocity components	
					var force = [0, 0];
					if(socket.player.keysDown.includes(KeyEnum.forward)) {
						add(force, mult(rad2dir(socket.player.status.rotation), socket.player.stats.acc));
					} 
					if(socket.player.keysDown.includes(KeyEnum.backward)) {
						sub(force, mult(rad2dir(socket.player.status.rotation), socket.player.stats.acc));
					}
					if(socket.player.keysDown.includes(KeyEnum.brake)) {
						sub(force, mult(norm(copy(socket.player.status.vel)), socket.player.stats.brakeFriction));
					}
					if(socket.player.keysDown.includes(KeyEnum.boost)) {
						if(socket.player.stats.boost && !socket.player.stats.boostCooldown) {
							console.log("Boosting");
							socket.player.stats.boostCooldown = true;
							add(force, mult(rad2dir(socket.player.status.rotation), socket.player.stats.boostForce));
							setTimeout(function(){ socket.player.stats.boostCooldown = false; }, socket.player.stats.boostCooldownTime);
							io.world.effects.push(particle.generateExplosion(sub(copy(socket.player.status.pos), mult(rad2dir(socket.player.status.rotation), socket.player.status.size[1]))));
						}
					}
					if(socket.player.keysDown.includes(KeyEnum.towerleft) && socket.player.stats.towerRotation) {
						socket.player.status.towerrotation -= socket.player.stats.towerRotationSpeed * elapsed;
					}
					if(socket.player.keysDown.includes(KeyEnum.towerright) && socket.player.stats.towerRotation) {
						socket.player.status.towerrotation += socket.player.stats.towerRotationSpeed * elapsed;
					}
					if(socket.player.keysDown.includes(KeyEnum.fire)) {
						if(socket.player.stats.rockets && !socket.player.stats.rocketsCooldown) {
							console.log("Shooting");
							socket.player.stats.rocketsCooldown = true;
							var rotation = socket.player.status.towerrotation + socket.player.status.rotation;
							var velocity = add(mult(rad2dir(rotation), socket.player.stats.rocketSpeed), socket.player.status.vel);
							
							io.world.projectiles.push({
								vel: velocity,
								rotation: rotation,
								pos: copy(socket.player.status.pos),
								owner: socket.player.status.id,
							});
							if(socket.player.stats.tripple) {
								var rotation2 = socket.player.status.towerrotation + socket.player.status.rotation + 0.2;
								var velocity2 = add(mult(rad2dir(rotation2), socket.player.stats.rocketSpeed), socket.player.status.vel);
								var rotation3 = socket.player.status.towerrotation + socket.player.status.rotation - 0.2;
								var velocity3 = add(mult(rad2dir(rotation3), socket.player.stats.rocketSpeed), socket.player.status.vel);
								io.world.projectiles.push({
									vel: velocity2,
									rotation: rotation2,
									pos: copy(socket.player.status.pos),
									owner: socket.player.status.id,
								});
								io.world.projectiles.push({
									vel: velocity3,
									rotation: rotation3,
									pos: copy(socket.player.status.pos),
									owner: socket.player.status.id,
								});
							}
							console.log(io.world.projectiles);
							setTimeout(function(){ socket.player.stats.rocketsCooldown = false; }, socket.player.stats.rocketsCooldownTime);
						}
					}
					
					sub(force, mult(norm(copy(socket.player.status.vel)), socket.player.stats.friction));
					
					// NaN problem with angles when stationary
					if(mag(socket.player.status.vel) > 0.17) {

						var forward = rad2dir(socket.player.status.rotation)
						
						var a = angle(copy(forward), copy(socket.player.status.vel));
						var forwardComponentMag = Math.cos(a) * mag(socket.player.status.vel);
						var forwardComponent = mult(forward, forwardComponentMag);
						var sideComponent = sub(copy(socket.player.status.vel), forwardComponent);
						sub(force, mult(sideComponent, socket.player.stats.grip));
						
						
						// Handle rotation
						if(socket.player.keysDown.includes(KeyEnum.left)) {
							socket.player.status.rotation -= socket.player.stats.rotationSpeed * forwardComponentMag * elapsed;
						}
						if(socket.player.keysDown.includes(KeyEnum.right)) {
							socket.player.status.rotation += socket.player.stats.rotationSpeed * forwardComponentMag * elapsed;
						}
					} else if(socket.player.stats.freeRotataion) {
						if(socket.player.keysDown.includes(KeyEnum.left)) {
							socket.player.status.rotation -= socket.player.stats.rotationSpeed * elapsed * 100;
						}
						if(socket.player.keysDown.includes(KeyEnum.right)) {
							socket.player.status.rotation += socket.player.stats.rotationSpeed * elapsed * 100;
						}
					}
					
					add(socket.player.status.vel, mult(force, elapsed));
					add(socket.player.status.pos, mult(copy(socket.player.status.vel), elapsed));
					
					// Check if player is in water
					if(level.isInWater(socket.player.status.pos)) {
						socket.player.status.health -= elapsed * config.parameters.waterDamage;
						if(socket.player.status.health <= 0) {
							io.world.effects.push(particle.generateExplosion(socket.player.status.pos));
							socket.player.status.alive = false;
							if(!io.world.arena) {
								socket.player.hud.scrap = 0;
								socket.emit('hud update', JSON.stringify(socket.player.hud));
							}
							setTimeout(() => {
								if(!io.world.arena && !socket.player.status.alive) {
									respawnPlayer(socket.player);
								}
							}, 2000);
						}
					}
				}
			});
			
			
			io.world.effects.map((effect) => {
				var age = Date.now() - effect.birth;
				effect.progress = age / effect.duration;
				if(effect.progress >= 1) {
					effect.done = true;
				} else {
					effect.particles.map((particle) => {
						add(particle.pos, mult(copy(particle.direction), particle.speed));
					});
				}
			});
			
			// Collision between projectiles and map elements
			io.world.projectiles.map((projectile) => {
				io.world.level.rocks.map((rock) => {
					if (dist(projectile.pos, rock.pos) < rock.radius) {
						projectile.done = true;
						io.world.effects.push(particle.generateExplosion(projectile.pos));					
					}
				});
			});
			
			io.world.effects = io.world.effects.filter((effect) => {
				return effect.done !== true;
			});
			io.world.projectiles = io.world.projectiles.filter((projectile) => {
				return projectile.done !== true;
			});
			io.world.scraps = io.world.scraps.filter((scrap) => {
				return scrap.done !== true;
			});
		}
	}, 16.6666);
	setInterval(() => {
		io.emit('world update', JSON.stringify({
			players: io.world.players,
			projectiles: io.world.projectiles,
			scraps: io.world.scraps,
			effects: io.world.effects,
		}));
	}, 16.6666);
});
