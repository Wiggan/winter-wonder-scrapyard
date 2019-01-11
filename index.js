var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var div = require('vectors/div')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var lerp = require('vectors/lerp')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var dist = require('vectors/dist')(2);
var limit = require('vectors/limit')(2);
require('./utility.js');
const math = require('mathjs');
var chance = require('chance').Chance();
var http = require('http');
var socket = require('socket.io');
var app = http.createServer();
var io = socket(app);
io.world = {
	level: {},
	players: [],
	projectiles: [],
	scraps: [],
	rocks: [],
	effects: [],
	gameState: {}
};
var selfReloadJSON = require('self-reload-json');
io.world.config = new selfReloadJSON('./config.json');
var LevelGenerator = require('./levelgenerator.js');
io.levelGenerator = new LevelGenerator(io);
var gameStateMachine = new (require('./gamestatemachine.js'))(io);

var Particle = require('./particlegenerator.js');
io.particleGenerator = new Particle();



var connectionCount = 0;

var KeyEnum = {
	forward: 87,
	backward: 83,
	left: 65,
	right: 68,
	brake: 32,
	boost: 69,
	parachute: 81,
	fire: 38,
	towerleft: 37,
	towerright: 39,
	leaveshop: 27
};
Object.freeze(KeyEnum);



global.setScrapCount = function(socket, count) {
	socket.player.hud.scrap = count;
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
}

function getPrerequisiteEdges(id) {
	return io.world.config.shop.edges.filter((edge) => { return edge.to === id });
}

global.getCurrentShop = function(player) {
	shop = JSON.parse(JSON.stringify(io.world.config.shop));
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

io.on('connection', function(socket){
	var playerId = connectionCount++;
	console.log('user ' + playerId + ' connected from ip: ' + socket.handshake.address);
	socket.on('disconnect', function(){
		console.log('user disconnected');
		io.world.players = io.world.players.filter((value) => { return socket.player.status.id !== value.id; });
		io.world.gameState.playerStates = io.world.gameState.playerStates.filter((player) => {
			return socket.player.hud !== player;
		});
		gameStateMachine.updateStateMachine();
	});
	socket.on('get shop', function(){
		socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
	});
	socket.on('ready', function(){
		socket.player.hud.ready = true;
		socket.emit('hud update', JSON.stringify(socket.player.hud));
	});
	socket.on('buy', function(id){
		var item = io.world.config.shop.nodes.find((node) => {return node.id == id});
		socket.player.upgrades.push(item.id);
		switch(item.id) {
			case 1: // Dubbdäck
				socket.player.status.dubbs = true;
				socket.player.status.tiresize = [5, 6];
				socket.player.stats.grip = item.grip;
				break;
			case 2: // Fri Rotation
				socket.player.stats.freeRotataion = true;
				break;
			case 3: // Bättre svängradie
				socket.player.stats.rotationSpeed = item.rotationSpeed;
				break;
			case 4: // Snabbare motor
				socket.player.stats.acc = item.acc;
				break;
			case 5: // Turboskjuts
				socket.player.stats.boost = true;
				socket.player.hud.boost = true;
				break;
			case 6: // Spikdäck
				socket.player.status.spikes = true;
				socket.player.status.tiresize = [6, 7];
				socket.player.stats.grip = item.grip;
				break;
			case 101: // Kofångare
				socket.player.stats.bumper = true;
				socket.player.status.bumper = true;
				break;
			case 102: // Vinklad nos
				socket.player.stats.nose = true;
				socket.player.status.nose = true;
				break;
			case 105: // Pontoner
				socket.player.status.pontons = true;
				socket.player.stats.waterDefense += item.waterDefense;
				break;
			case 104: // Skovelhjul
				socket.player.status.paddle = true;
				socket.player.stats.waterDefense += item.waterDefense;
				break;
			case 103: // Bromsskärm
				socket.player.stats.parachute = true;
				socket.player.hud.parachute = true;
				break;
			case 201: // Raketgevär
				socket.player.status.rockets = true;
				socket.player.stats.rockets = true;
				socket.player.hud.rockets = true;
				break;
			case 202: // Handvetat kanontorn
				socket.player.stats.towerRotation = true;
				socket.player.hud.towerRotation = true;
				break;
			case 203: // Servokanontorn
				socket.player.stats.towerRotationSpeed = item.towerRotationSpeed;
				break;
			case 204: // Trippelraket
				socket.player.status.tripple = true;
				socket.player.stats.tripple = true;
				break;
			case 205: // Lasersikte
				socket.player.status.laser = true;
				break;
				
			default:
				break;
		}
		setScrapCount(socket, socket.player.hud.scrap - item.cost);
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
			case KeyEnum.parachute:
			case KeyEnum.fire:
			case KeyEnum.towerleft:
			case KeyEnum.towerright:
				socket.player.keysDown.push(key);
				updateAppearanceDueToKeyEvent(socket.player);
			break;
			case KeyEnum.leaveshop:
				if(socket.player.hud.shopping === true) {
					socket.player.hud.shopping = false;
					socket.emit('hud update', JSON.stringify(socket.player.hud));
					setTimeout(() => { gameStateMachine.respawnPlayer(socket); }, 1000);
				}
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
			case KeyEnum.parachute:
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
	var pos = io.levelGenerator.getCollisionFreePosition();
	var rotation = io.levelGenerator.getInwardRotation(pos);
	socket.player = {
		keysDown: [],
		status: {
			id: playerId,
			pos: pos,
			rotation: rotation,
			color: color,
			alive: io.world.gameState.state === StateEnum.arena ? false : true
		},
		hud: {
			name: chance.prefix({ full: false }) + " " + chance.word({ syllables: 2 }),
			scrap: io.world.gameState.state === StateEnum.lobby ? 100 : 0,
			color: color,
			notification: undefined,
		},
		upgrades: []
	};
	socket.player.status = Object.assign(JSON.parse(JSON.stringify(io.world.config.player.status)), socket.player.status);
	socket.player.stats = JSON.parse(JSON.stringify(io.world.config.player.stats));
	socket.player.hud = Object.assign(JSON.parse(JSON.stringify(io.world.config.player.hud)), socket.player.hud);
	
	io.world.players.push(socket.player.status);
	io.world.gameState.playerStates.push(socket.player.hud);
	gameStateMachine.updateStateMachine();
	
	if(io.world.gameState.state !== StateEnum.arena) {
		socket.player.hud.notification = {
			pos: socket.player.status.pos,
			radius: socket.player.status.size[1] + 20
		};
		setTimeout(() => {
				socket.player.hud.notification = undefined;
				socket.emit('hud update', JSON.stringify(socket.player.hud));
		}, 2000);
	}
	
	
	socket.emit('new map', JSON.stringify(io.world.level));
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	socket.emit('game update', JSON.stringify(io.world.gameState));
	socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
	if(io.world.gameState.state === StateEnum.normal) {
		socket.emit('countdown started', getTimeLeft(io.world.arenaTimeout));
	}
});

function getTimeLeft(timeout) { // Requires haxing in a _startTime = Date.now() when starting timer...
    return Math.floor((timeout._startTime + timeout._idleTimeout - Date.now()) / 1000);
}

function damagePlayer(socket, damage) {
	socket.player.hud.health -= damage;
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	if(socket.player.hud.health <= 0) {
		io.world.effects.push(io.particleGenerator.generateExplosion(socket.player.status.pos));
		socket.player.status.alive = false;
		switch(io.world.gameState.state) {
			case StateEnum.arena:
				var alivers = 0;
				Object.values(io.sockets.sockets).map((socket2) => {
					if(socket2.player.status.alive) alivers++;
				});
				setScrapCount(socket, socket.player.hud.scrap + alivers);
				console.log("Rewarding player " + socket.player.hud.name + " " + alivers + " scrap");
			break;
			case StateEnum.normal:
				var scrapCountAtDeath = socket.player.hud.scrap;
				setScrapCount(socket, 0);
				setTimeout(() => {
					if(io.world.gameState.state != StateEnum.arena) {
						var scrapPos = io.levelGenerator.getCollisionFreePosition();
						io.world.effects.push(io.particleGenerator.generateScrapSpawn(scrapPos, Math.min(scrapCountAtDeath*5, 35)));
						for(var i=0; i<scrapCountAtDeath; i++) {
							io.world.scraps.push({pos: [scrapPos[0] - getRandomIntInclusive(-6, 6), scrapPos[1] - getRandomIntInclusive(-6, 6)]});
						}
					}
				}, 1000);
			case StateEnum.lobby:
				setTimeout(() => {
					if(!socket.player.status.alive && io.world.gameState.state != StateEnum.arena) {
						gameStateMachine.respawnPlayer(socket);
					}
				}, 2000);								
			break;
		}
	}
}

app.listen(3000, function(){
    console.log('listening on *:3000');
	
	gameStateMachine.startLobby();
	
    setInterval(() => {
		var elapsed = 0.016666; // Fix this
		if(io.world.gameState.physicsOn) {
			// Collision
			Object.values(io.sockets.sockets).map((socket1) => {
				// fast forward inner loop, to avoid duplicate pairs.
				var ff = false;
				var pos1 = socket1.player.status.pos;
				Object.values(io.sockets.sockets).map((socket2) => {
					if(socket1 == socket2) { ff = true; };
					if(ff) {
						var pos2 = socket2.player.status.pos;
						var distance = dist(pos1, pos2);
						var radii = socket2.player.status.size[0]*2;
						if (socket1 != socket2 && socket1.player.status.alive===true && socket2.player.status.alive===true && distance < radii) {
							var direction = norm(sub(copy(pos2), pos1));
							var vel1 = copy(socket1.player.status.vel);
							var vel2 = copy(socket2.player.status.vel);
							var impact1 = [0, 0];
							var impact2 = [0, 0];
							if(mag(vel1) > 0.1) {
								impact1 = mult(copy(direction), scalarProjection(vel1, copy(direction)));
								sub(socket1.player.status.vel, impact1);
								if(socket1.player.stats.bumper && Math.abs(angle(impact1, rad2dir(socket1.player.status.rotation))) < 0.8) {
									mult(impact1, socket1.player.stats.bumperFactor);
									damagePlayer(socket2, 5);
								}
								add(socket2.player.status.vel, impact1);
							}
							if (mag(vel2) > 0.1) {
								var opposite = mult(copy(direction), -1);
								impact2 = mult(copy(opposite), scalarProjection(vel2, opposite));
								sub(socket2.player.status.vel, impact2);
								if(socket2.player.stats.bumper && Math.abs(angle(impact2, rad2dir(socket2.player.status.rotation))) < 0.8) {
									mult(impact2, socket2.player.stats.bumperFactor);
									damagePlayer(socket1, 5);
								}
								add(socket1.player.status.vel, impact2);
							}
							
							moveback1 = (radii - distance) * mag(impact1) / (mag(impact1) + mag(impact2));
							moveback2 = -(radii - distance) * mag(impact2) / (mag(impact1) + mag(impact2));
							
							sub(socket1.player.status.pos, mult(copy(direction), moveback1));
							sub(socket2.player.status.pos, mult(copy(direction), moveback2));
							
							if (mag(vel1) + mag(vel2) > 10) {
								io.world.effects.push(io.particleGenerator.generateSmoke(sub(copy(pos2), mult(copy(direction), socket2.player.status.size[0])), 1));
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
							io.world.effects.push(io.particleGenerator.generateSmoke(add(copy(rock.pos), mult(copy(direction), rock.radius)),mag(component)/300));
							
						}
					}
				});
				
				// Collision with projectiles
				io.world.projectiles.map((projectile) => {
					var pos2 = projectile.pos;
					if (socket1.player.status.id != projectile.owner && dist(pos1, pos2) < socket1.player.status.size[0]) {
						var direction = norm(copy(projectile.vel));
						if(socket1.player.stats.nose && Math.abs(angle(direction, rad2dir(socket1.player.status.rotation + Math.PI))) < 0.6 && Math.random() < 0.5) {
							console.log("Deflected! Incoming angle: " + Math.abs(angle(direction, rad2dir(socket1.player.status.rotation + Math.PI))));
							var magnitude = mag(projectile.vel);
							var newDirection = norm(rad2dir(dir2rad(projectile.vel) + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2)));
							projectile.vel = mult(copy(newDirection), magnitude);
							projectile.pos = add(copy(pos1), mult(copy(newDirection), socket1.player.status.size[0] + 1));
							io.world.effects.push(io.particleGenerator.generateSmoke(projectile.pos, 1));
						} else {
							add(socket1.player.status.vel, mult(direction, socket1.player.stats.rocketForce));
							damagePlayer(socket1, 10);
							projectile.done = true;
							io.world.effects.push(io.particleGenerator.generateExplosion(projectile.pos));
						}
					}
				});
				
				// Collision with scrap
				io.world.scraps.map((scrap) => {
					if (dist(pos1, scrap.pos) < socket1.player.status.size[1]) {
						setScrapCount(socket1, socket1.player.hud.scrap + 1);
						io.world.effects.push(io.particleGenerator.generateGold(scrap.pos));
						scrap.done = true;
					}
				});
				
				// Collision with critters
				io.world.level.critters.map((critter) => {
					if (dist(pos1, critter.pos) < socket1.player.status.size[1]) {
						io.world.effects.push(io.particleGenerator.generateBlood(critter.pos, socket1.player.status.vel));
						io.world.effects.push(io.particleGenerator.generateBloodStain(critter.pos));
						critter.done = true;
					}
				});
				
				// Parachute effective 
				if(socket1.player.status.parachute) {
					add(socket1.player.status.parachute.pos, mult(copy(socket1.player.status.parachute.vel), elapsed));
					if(dist(socket1.player.status.parachute.pos, socket1.player.status.pos) > 50 && !socket1.player.status.parachute.effective) {
						socket1.player.status.parachute.effective = true;
						mult(socket1.player.status.vel, 0.4);
						socket1.player.status.parachute.vel = copy(socket1.player.status.vel);
						socket1.player.status.rotation = dir2rad(sub(copy(socket1.player.status.parachute.pos), socket1.player.status.pos));
						socket1.player.status.parachute.rotation = dir2rad(sub(copy(socket1.player.status.pos), socket1.player.status.parachute.pos));
						setTimeout(() => { socket1.player.status.parachute = undefined; }, 300);
					}
				}
				
				// Is shopping?
				if(io.world.level.shop !== undefined) {
					if(socket1.player.status.alive===true && dist(pos1, io.world.level.shop.pos) < io.world.level.shop.radius) {
						if(socket1.player.hud.shopping === false) {
							socket1.player.hud.shopping = true;
							socket1.player.hud.health = 100;
							socket1.player.status.alive = false;
							socket1.player.status.vel = [0, 0];
							socket1.player.status.pos = copy(io.world.level.shop.pos);
							socket1.emit('hud update', JSON.stringify(socket1.player.hud));
						}
					}
				}
				
			});
			
			// Move projectiles and kill them if too far away
			io.world.projectiles.map((projectile) => {
				add(projectile.pos, mult(copy(projectile.vel), elapsed));
				if (mag(projectile.pos) > 2000) {
					projectile.done = true;
				}
			});
			
			// Move critters
			io.world.level.critters.map((critter) => {
				add(critter.vel, mult(copy(critter.acc), elapsed));
				add(critter.pos, mult(copy(critter.vel), elapsed));
				critter.rotation = dir2rad(critter.vel);
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
							socket.emit('cooldown', JSON.stringify({
								item: "boost",
								time: socket.player.stats.boostCooldownTime
							}));
							io.world.effects.push(io.particleGenerator.generateExplosion(sub(copy(socket.player.status.pos), mult(rad2dir(socket.player.status.rotation), socket.player.status.size[1]))));
						}
					}
					if(socket.player.keysDown.includes(KeyEnum.parachute)) {
						if(socket.player.stats.parachute && !socket.player.stats.parachuteCooldown) {
							console.log("Parachuting");
							socket.player.stats.parachuteCooldown = true;
							socket.player.status.parachute = {
								pos: copy(socket.player.status.pos),
								vel: [0, 0],
								rotation: socket.player.status.rotation,
								effective: false
							};
							setTimeout(() => { socket.player.status.parachute = undefined; }, 3000);
							setTimeout(function(){ socket.player.stats.parachuteCooldown = false; }, socket.player.stats.parachuteCooldownTime);
							socket.emit('cooldown', JSON.stringify({
								item: "parachute",
								time: socket.player.stats.parachuteCooldownTime
							}));
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
							socket.player.stats.rocketsCooldown = true;
							var rotation = socket.player.status.towerrotation + socket.player.status.rotation;
							var velocity = mult(rad2dir(rotation), socket.player.stats.rocketSpeed);
							var position = sub(copy(socket.player.status.pos), mult(rad2dir(socket.player.status.rotation), 4))
							io.world.projectiles.push({
								vel: velocity,
								rotation: rotation,
								pos: copy(position),
								owner: socket.player.status.id,
							});
							if(socket.player.stats.tripple) {
								var rotation2 = socket.player.status.towerrotation + socket.player.status.rotation + 0.2;
								var velocity2 = mult(rad2dir(rotation2), socket.player.stats.rocketSpeed)
								var rotation3 = socket.player.status.towerrotation + socket.player.status.rotation - 0.2;
								var velocity3 = mult(rad2dir(rotation3), socket.player.stats.rocketSpeed);
								io.world.projectiles.push({
									vel: velocity2,
									rotation: rotation2,
									pos: copy(position),
									owner: socket.player.status.id,
								});
								io.world.projectiles.push({
									vel: velocity3,
									rotation: rotation3,
									pos: copy(position),
									owner: socket.player.status.id,
								});
							}
							setTimeout(function(){ socket.player.stats.rocketsCooldown = false; }, socket.player.stats.rocketsCooldownTime);
							socket.emit('cooldown', JSON.stringify({
								item: "rocket",
								time: socket.player.stats.rocketsCooldownTime
							}));
						}
					}
					
					sub(force, mult(norm(copy(socket.player.status.vel)), socket.player.stats.friction));
					
					// NaN problem with angles when stationary
					if(mag(socket.player.status.vel) > 1.5) {

						var forward = rad2dir(socket.player.status.rotation)
						
						var a = angle(copy(forward), copy(socket.player.status.vel));
						var forwardComponentMag = Math.cos(a) * mag(socket.player.status.vel);
						var forwardComponent = mult(forward, forwardComponentMag);
						var sideComponent = sub(copy(socket.player.status.vel), forwardComponent);
						sub(force, mult(sideComponent, socket.player.stats.grip));
						
						if(mag(sideComponent) > 30) {
							if(Date.now() % 100 < 20) {
								io.world.effects.push(io.particleGenerator.generateDust(socket.player.status.pos, sideComponent));
							}
						}
						
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
					if(io.levelGenerator.isInWater(socket.player.status.pos)) {
						damagePlayer(socket, elapsed * (io.world.config.parameters.waterDamage - socket.player.stats.waterDefense));
					}
				}
			});
			
			
			
			
			// Collision between projectiles and map elements
			io.world.projectiles.map((projectile) => {
				io.world.level.rocks.map((rock) => {
					if (dist(projectile.pos, rock.pos) < rock.radius) {
						projectile.done = true;
						io.world.effects.push(io.particleGenerator.generateExplosion(projectile.pos));					
					}
				});
			});
			
			
		}
		
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
		
		io.world.effects = io.world.effects.filter((effect) => {
			return effect.done !== true;
		});
		io.world.projectiles = io.world.projectiles.filter((projectile) => {
			return projectile.done !== true;
		});
		io.world.scraps = io.world.scraps.filter((scrap) => {
			return scrap.done !== true;
		});
		io.world.level.critters = io.world.level.critters.filter((critter) => {
			return critter.done !== true;
		});
		io.world.projectiles.map((projectile) => {
			io.world.effects.push(io.particleGenerator.generateRocketTail(projectile.pos, projectile.vel));
		});
	}, 16.6666);
	setInterval(() => {
		io.emit('world update', JSON.stringify({
			players: io.world.players,
			projectiles: io.world.projectiles,
			scraps: io.world.scraps,
			effects: io.world.effects,
			critters: io.world.level.critters,
		}));
	}, 16.6666);
	setInterval(() => {
		runFlocking(io.world.level.critters);
	}, 200);
});

function runFlocking(flock) {
	const desiredSeparation = 15;
	const alignmentDistance = 100;
	const cohesionDistance = 150;
	const desiredPlayerDistance = 100;
	
	const maxForce = 2;
	const maxSpeed = 100;
	
	const sensorLength = 20;
	const sensors = [mult(rad2dir(0), sensorLength),
					 mult(rad2dir(Math.PI / 3), sensorLength),
					 mult(rad2dir(Math.PI * 2 / 3), sensorLength),
					 mult(rad2dir(Math.PI), sensorLength),
					 mult(rad2dir(Math.PI * 4 / 3), sensorLength),
					 mult(rad2dir(Math.PI * 5 / 3), sensorLength),];
	flock.map((critter) => {
		var separation = [0, 0];
		var alignment = [0, 0];
		var cohesion = [0, 0];
		var playerAvoidance = [0, 0];
		var waterAvoidance = [0, 0];
		var separationCount = 0;
		var alignmentCount = 0;
		var cohesionCount = 0;
		var playerCount = 0;
		var waterCount = 0;
		flock.map((other) => {
			// Separation
			if(dist(critter.pos, other.pos) < desiredSeparation) {
				add(separation, sub(copy(critter.pos), other.pos));
				separationCount++;
			}
			
			// Alignment
			if(dist(critter.pos, other.pos) < alignmentDistance) {
				add(alignment, other.vel);
				alignmentCount++;
			}
			
			// Cohesion
			if(dist(critter.pos, other.pos) < cohesionDistance) {
				add(cohesion, other.pos);
				cohesionCount++;
			}
		});
		
		// Level avoidance
		sensors.map((sensor) => {
			var position = add(copy(critter.pos), sensor);
			if(io.levelGenerator.isInWater(position) || io.levelGenerator.isCollidingWithMapElements(position)){
				sub(waterAvoidance, sensor);
				waterCount++;
			}
		});
		
		// Player avoidance
		Object.values(io.sockets.sockets).map((socket) => {
			var distance = dist(critter.pos, socket.player.status.pos);
			if(distance < desiredPlayerDistance) {
				add(playerAvoidance, mult(sub(copy(critter.pos), socket.player.status.pos), desiredPlayerDistance - distance));
				playerCount++;
			}
		});
		
		// Get out of water
		if(io.levelGenerator.isInWater(critter.pos)) {
			add(waterAvoidance, sub([io.levelGenerator.width/2, io.levelGenerator.height/2], critter.pos));
			waterCount++;
		}
		
		if(separationCount > 0) {
			div(separation, separationCount);
			limit(sub(mult(norm(separation), maxSpeed), critter.vel), maxForce);
		}
		if(alignmentCount > 0)  {
			div(alignment, alignmentCount);
			limit(sub(mult(norm(alignment), maxSpeed), critter.vel), maxForce);
		}
		if(cohesionCount > 0)  {
			div(cohesion, cohesionCount);
			limit(sub(mult(norm(sub(cohesion, critter.pos)), maxSpeed), critter.vel), maxForce);
		}
		if(playerCount > 0)  {
			div(playerAvoidance, playerCount);
			limit(sub(mult(norm(playerAvoidance), maxSpeed), critter.vel), maxForce*10);
		}
		if(waterCount > 0)  {
			div(waterAvoidance, waterCount);
			limit(sub(mult(norm(waterAvoidance), maxSpeed), critter.vel), maxForce);
		}
		
		critter.acc = [0, 0];
		add(critter.acc, mult(separation, 1.5));
		add(critter.acc, mult(alignment, 0.9));
		add(critter.acc, cohesion);
		add(critter.acc, mult(playerAvoidance, 2));
		add(critter.acc, mult(waterAvoidance, 2));
	});
}
