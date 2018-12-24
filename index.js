var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var lerp = require('vectors/lerp')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var dist = require('vectors/dist')(2);
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
	fire: 38,
	towerleft: 37,
	towerright: 39
};
Object.freeze(KeyEnum);



function setScrapCount(socket, count) {
	socket.player.hud.scrap = count;
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
}

function getPrerequisiteEdges(id) {
	return io.world.config.shop.edges.filter((edge) => { return edge.to === id });
}

function getCurrentShop(player) {
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
			case 201: // Raketgevär
				socket.player.status.rockets = true;
				socket.player.stats.rockets = true;
				break;
			case 202: // Handvetat kanontorn
				socket.player.stats.towerRotation = true;
				break;
			case 203: // Servokanontorn
				socket.player.stats.towerRotationSpeed = item.towerRotationSpeed;
				break;
			case 204: // Trippelraket
				socket.player.status.tripple = true;
				socket.player.stats.tripple = true;
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
	var pos = io.levelGenerator.getCollisionFreePosition();
	var rotation = io.levelGenerator.getInwardRotation(pos);
	socket.player = {
		keysDown: [],
		status: {
			id: playerId,
			pos: pos,
			vel: [0, 0],
			rotation: rotation,
			towerrotation: 0,
			turning: 0,
			driving: 0,
			alive: true,

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
			scrap: 100,
			health: 100,
			color: color,
			shopping: false,
			score: 0,
			ready: false,
			notification: undefined,
		},
		upgrades: []
	};
	io.world.players.push(socket.player.status);
	io.world.gameState.playerStates.push(socket.player.hud);
	socket.emit('new map', JSON.stringify(io.world.level));
	socket.emit('hud update', JSON.stringify(socket.player.hud));
	socket.emit('game update', JSON.stringify(io.world.gameState));
});




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
								}
								add(socket2.player.status.vel, impact1);
							}
							if (mag(vel2) > 0.1) {
								var opposite = mult(copy(direction), -1);
								impact2 = mult(copy(opposite), scalarProjection(vel2, opposite));
								sub(socket2.player.status.vel, impact2);
								if(socket2.player.stats.bumper && Math.abs(angle(impact2, rad2dir(socket2.player.status.rotation))) < 0.8) {
									mult(impact2, socket2.player.stats.bumperFactor);
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
						add(socket1.player.status.vel, mult(direction, socket1.player.stats.rocketForce));
						projectile.done = true;
						io.world.effects.push(io.particleGenerator.generateExplosion(projectile.pos));
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
				
				// Is shopping?
				if(io.world.level.shop !== undefined) {
					if(dist(pos1, io.world.level.shop.pos) < io.world.level.shop.radius) {
						if(socket1.player.hud.shopping === false) {
							socket1.player.hud.shopping = true;
							socket1.player.hud.health = 100;
							socket1.player.status.vel = [0, 0];
							socket1.player.status.pos = copy(io.world.level.shop.pos);
							socket1.emit('hud update', JSON.stringify(socket1.player.hud));
						}
					} else if(socket1.player.hud.shopping === true) {
						socket1.player.hud.shopping = false;
						socket1.emit('hud update', JSON.stringify(socket1.player.hud));
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
							io.world.effects.push(io.particleGenerator.generateExplosion(sub(copy(socket.player.status.pos), mult(rad2dir(socket.player.status.rotation), socket.player.status.size[1]))));
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
					if(io.levelGenerator.isInWater(socket.player.status.pos)) {
						socket.player.hud.health -= elapsed * io.world.config.parameters.waterDamage;
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
											io.world.effects.push(io.particleGenerator.generateScrapSpawn(scrapPos, scrapCountAtDeath*5));
											for(var i=0; i<scrapCountAtDeath; i++) {
												io.world.scraps.push({pos: [scrapPos[0] - getRandomIntInclusive(-3, 3), scrapPos[1] - getRandomIntInclusive(-3, 3)]});
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
