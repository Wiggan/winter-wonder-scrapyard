var chance = require('chance').Chance();
require('./utility.js');
var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);

global.StateEnum = {
	lobby: 1,
	normal: 2,
	arena: 3,
	transition: 4,
	shopping: 5
};
Object.freeze(global.StateEnum);


module.exports = class GameStateMachine {
	constructor(io) {
		this.io = io;
		this.io.world.gameState = {
			playerStates: [],
			state: StateEnum.lobby,
			physicsOn: true,
			msg: 0,
		};
		setInterval(() => this.updateStateMachine(), 1000);
	}

	updateStateMachine() {
		var connectionCount = this.io.engine.clientsCount;
		switch(this.io.world.gameState.state) {
			case StateEnum.lobby:
				var readyCount = 0;
				Object.values(this.io.sockets.sockets).map((socket) => {
					if(socket.player.hud.ready) readyCount++;
					socket.emit('hud update', JSON.stringify(socket.player.hud));
				});
				if(readyCount === connectionCount && connectionCount > 1) {
					console.log("All are ready, game is starting!");
					this.resetPlayers();
					this.startNormalRound();
				}
			break;
			case StateEnum.normal:
				if(connectionCount < 2) {
					this.resetPlayers();
					this.startLobby();
				}
			break;
			case StateEnum.shopping:
				if(connectionCount < 2) {
					this.resetPlayers();
					this.startLobby();
				}
				var shoppingCount = 0;
				Object.values(this.io.sockets.sockets).map((socket) => {
					if(socket.player.hud.shopping) shoppingCount++;
				});
				if(shoppingCount == 0) {
					clearTimeout(this.io.world.shoppingTimeout);
					this.startArenaRound();
					console.log("All shopping is done");
				}
			break;
			case StateEnum.arena:
				if(connectionCount < 2) {
					this.resetPlayers();
					this.startLobby();
					break;
				}
				var alivers = [];
				Object.values(this.io.sockets.sockets).map((socket) => {
					if(socket.player.status.alive) alivers.push(socket.player.hud);
				});
				if(alivers.length <= 1) {
					if(alivers.length == 1) {
						alivers[0].score++;
						var winner = this.doWeHaveAWinner();
						if(winner !== undefined) {
							this.io.world.gameState.msg = winner.name + " won the game!!!!";
							this.io.emit('game update', JSON.stringify(this.io.world.gameState));
							this.io.world.gameState.state = StateEnum.transition;
							setTimeout(() => {
								this.startLobby();
							}, 5000);
							break;
						} else {
							this.io.world.gameState.msg = alivers[0].name + " won the arena!";
							this.io.emit('game update', JSON.stringify(this.io.world.gameState));
						}
					}
					this.io.world.gameState.state = StateEnum.transition;
					setTimeout(() => {
						this.startNormalRound();
					}, 2000);
				}
			break;
			default:
			break;
		}
		this.io.world.gameState.playerStates.sort((a, b) => { 
			if (a.score > b.score) {
				return -1;
			} else if(a.score < b.score) {
				return 1;
			} else {
				return 0;
			}
		});
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		
	}
	
	resetPlayers() {
		Object.values(this.io.sockets.sockets).map((socket) => {
			socket.player.stats = Object.assign(socket.player.stats, JSON.parse(JSON.stringify(this.io.world.config.player.stats)));
			socket.player.status = Object.assign(socket.player.status, JSON.parse(JSON.stringify(this.io.world.config.player.status)));
			socket.player.hud = Object.assign(socket.player.hud, JSON.parse(JSON.stringify(this.io.world.config.player.hud)));
			socket.player.upgrades = [];
			setScrapCount(socket, 0);
		});
	}
	
	respawnPlayer(socket, arena, index, count) {
		if(arena) {
			socket.player.status.pos = add(mult(rad2dir(index / count * 2 * Math.PI), 200), [this.io.levelGenerator.width/2, this.io.levelGenerator.height/2]);
		} else {
			socket.player.status.pos = this.io.levelGenerator.getCollisionFreePosition();
		}
		socket.player.status.vel = [0, 0];
		socket.player.status.rotation = this.io.levelGenerator.getInwardRotation(socket.player.status.pos);
		socket.player.status.towerrotation = 0;
		socket.player.status.alive = true;
		socket.player.status.parachute = null;
		socket.player.hud.health = 100;
		socket.emit('hud update', JSON.stringify(socket.player.hud));
	}

	doWeHaveAWinner() {
		var winner = undefined;
		Object.values(this.io.sockets.sockets).map((socket) => {
			if(socket.player.hud.score === this.io.world.config.parameters.winnerScore) {
				winner = socket.player.hud;
			}
		});
		return winner;
	}
	
	startNormalRound() {
		console.log("Starting normal round!");
		this.io.world.gameState.physicsOn = false;
		this.io.world.gameState.state = StateEnum.normal;
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		this.io.world.scraps = [];
		this.io.world.projectiles = [];
		this.io.world.level = this.io.levelGenerator.generate(800, 600);
		this.io.emit('new map', JSON.stringify(this.io.world.level));
		Object.values(this.io.sockets.sockets).map((socket) => {
			this.respawnPlayer(socket);
		});
		
		this.io.world.scrapInterval = setInterval(() => {
			if(this.io.world.scraps.length < this.io.world.config.parameters.scrapCap) {
				var pos = this.io.levelGenerator.getCollisionFreePosition();
				this.io.world.effects.push(this.io.particleGenerator.generateScrapSpawn(pos, 5));
				this.io.world.scraps.push({pos: pos});
			}
		}, this.io.world.config.parameters.scrapInterval);
		
		this.io.world.arenaTimeout = setTimeout(() => {
			this.startShopping();
		}, this.io.world.config.parameters.roundTime);
		this.io.world.arenaTimeout._startTime = Date.now();
		this.io.emit('countdown started', this.io.world.config.parameters.roundTime / 1000);
		this.runCountDown("Collect scrap and buy upgrades");
	}

	startShopping() {
		console.log("Starting mandatory shopping!");
		clearInterval(this.io.world.scrapInterval);
		this.io.world.gameState.physicsOn = false;
		Object.values(this.io.sockets.sockets).map((socket) => {
			socket.player.hud.shopping = true;
			socket.player.status.alive = false;
			socket.emit('get shop', JSON.stringify(getCurrentShop(socket.player)));
			socket.emit('hud update', JSON.stringify(socket.player.hud));
		});
		this.io.world.gameState.state = StateEnum.shopping;
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		this.io.world.shoppingTimeout = setTimeout(() => {
			this.startArenaRound();
		}, this.io.world.config.parameters.shoppingTime);
	}
	
	startArenaRound() {
		console.log("Starting arena!");
		this.io.world.gameState.state = StateEnum.arena;
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		this.io.world.scraps = [];
		this.io.world.projectiles = [];
		this.io.world.level = this.io.levelGenerator.generate(800, 600, true);
		this.io.emit('new map', JSON.stringify(this.io.world.level));
		var socketCount = Object.keys(this.io.sockets.sockets).length;
		for(var i = 0; i < socketCount; i++) {
			var socket = Object.values(this.io.sockets.sockets)[i];
			socket.player.hud.shopping = false;
			this.respawnPlayer(socket, true, i, socketCount);
		}
		
		this.runCountDown("Entering Arena");
	}

	startLobby() {
		console.log("Starting lobby!");
		clearInterval(this.io.world.scrapInterval);
		clearTimeout(this.io.world.arenaTimeout);
		this.io.world.scraps = [];
		this.io.world.projectiles = [];
		this.io.world.gameState.physicsOn = false;
		this.io.world.gameState.state = StateEnum.lobby;
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		this.io.world.level = this.io.levelGenerator.generate(800, 600);
		this.io.emit('new map', JSON.stringify(this.io.world.level));
		
		Object.values(this.io.sockets.sockets).map((socket) => {
			this.respawnPlayer(socket);
			socket.player.hud.ready = false;
			setScrapCount(socket, 100);
		});
		this.runCountDown("Entering Lobby");
	}
	
	runCountDown(prefix) {
		this.io.world.gameState.msg = prefix + "\n2";
		this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		Object.values(this.io.sockets.sockets).map((socket) => {
			socket.player.hud.notification = {
				pos: socket.player.status.pos,
				radius: socket.player.status.size[1] + 20
			};
			socket.emit('hud update', JSON.stringify(socket.player.hud));
		});
		setTimeout(() => {
			this.io.world.gameState.msg = prefix + "\n1";
			this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		}, 1000);
		setTimeout(() => {
			this.io.world.gameState.physicsOn = true;
			this.io.world.gameState.msg = prefix + "\nGo!";
			this.io.emit('game update', JSON.stringify(this.io.world.gameState));
			Object.values(this.io.sockets.sockets).map((socket) => {
				socket.player.hud.notification = undefined;
				socket.emit('hud update', JSON.stringify(socket.player.hud));
			});
		}, 2000);
		setTimeout(() => {
			this.io.world.gameState.msg = "";
			this.io.emit('game update', JSON.stringify(this.io.world.gameState));
		}, 3000);
	}

}