import React from 'react';
import Socket from './socket'
import Shop from './shop'
import './game.css'

var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var div = require('vectors/div')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var lerp = require('vectors/lerp')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var dist = require('vectors/dist')(2);

const width = 800;
const height = 600;

function getClosestPointOnSegment(start, stop, point) {
	var segment = sub(copy(stop), start);
	var magnitude2 = segment[0]*segment[0] + segment[1]*segment[1];
	var dotProduct = dot(sub(copy(point), start), segment);
	var distance = dotProduct / magnitude2;
	if(distance < 0.0) {
		return start;
	} else if(distance > 1.0) {
		return stop;
	} else {
		return add(copy(start), mult(segment, distance));
	}
}

function rad2dir(rad) {
	return [-Math.sin(rad), Math.cos(rad)];
}

class Game extends React.Component { 

	constructor() {
		super();
		this.state = {
			world: {
				players: [],
				critters: [],
				projectiles: [],
				scraps: [],
				effects: [],
				msg: "",
				notification: undefined,
			}
		}; 
	}

	render() {
		return (
			<div>
				<canvas className="canvas" width={width} height={height} ref={node => this.backbuffer1 = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.tracecanvas2 = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.tracecanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.bgcanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.mapcanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.canvas = node} ></canvas>
				<Shop ref={node => this.shop = node}/>
			</div>
		);
    }
	
	drawMap(ctx) {
		var bb1 = this.backbuffer1.getContext("2d");
		var ctx2 = this.tracecanvas2.getContext("2d");
		bb1.clearRect(0, 0, width, height);
		bb1.drawImage(this.tracecanvas2, 0, 0);
		ctx2.clearRect(0, 0, width, height);
		ctx2.globalAlpha = 0.82;
		ctx2.drawImage(this.backbuffer1, 0, 0);
		ctx2.globalAlpha = 1.0;
		
	
		var origShadowColor = ctx.shadowColor;
		ctx.shadowColor = "rgb(150, 190, 255)";
		ctx.shadowBlur = 4;
		ctx.drawImage(this.mapcanvas, 0, 0);
		ctx.shadowColor = origShadowColor;
		ctx.save();
		ctx.globalCompositeOperation = "source-atop";
		ctx.globalAlpha = 0.2;
		ctx.drawImage(this.tracecanvas, 0, 0);
		ctx.globalAlpha = 1.0;
		ctx.drawImage(this.tracecanvas2, 0, 0);
		ctx.globalCompositeOperation = "source-over";
	
		
		ctx.restore();
	}
	
	renderLand(ctx) {
		if(this.state.world.level !== undefined) {
			ctx.fillStyle = this.state.world.level.colors[1];
			for(var x = 0; x < this.state.world.level.grid.length; x++) {
				for(var y = 0; y < this.state.world.level.grid[0].length; y++) {
					if(this.state.world.level.grid[x][y] === 1) {
						ctx.beginPath()
						var x1 = x * this.state.world.level.squareSize;
						var y1 = y * this.state.world.level.squareSize;
						var x2 = x1 + this.state.world.level.squareSize;
						var y2 = y1 + this.state.world.level.squareSize;
						if(this.state.world.level.grid[x-1][y] + this.state.world.level.grid[x+1][y] + this.state.world.level.grid[x][y-1] + this.state.world.level.grid[x][y+1] > 2) {
							ctx.moveTo(x1, y1);
							ctx.lineTo(x2, y1);
							ctx.lineTo(x2, y2);
							ctx.lineTo(x1, y2);
							ctx.lineTo(x1, y1);
						} else if(this.state.world.level.grid[x-1][y] + this.state.world.level.grid[x][y-1] === 2) {
							ctx.moveTo(x1, y1);
							ctx.lineTo(x2, y1);
							ctx.quadraticCurveTo(x2, y2, x1, y2);
							ctx.lineTo(x1, y1);
						} else if(this.state.world.level.grid[x][y+1] + this.state.world.level.grid[x-1][y] === 2) {
							ctx.moveTo(x1, y1);
							ctx.lineTo(x1, y2);
							ctx.lineTo(x2, y2);
							ctx.quadraticCurveTo(x2, y1, x1, y1);
						} else if(this.state.world.level.grid[x][y+1] + this.state.world.level.grid[x+1][y] === 2) {
							ctx.moveTo(x2, y1);
							ctx.lineTo(x2, y2);
							ctx.lineTo(x1, y2);
							ctx.quadraticCurveTo(x1, y1, x2, y1);
						} else if(this.state.world.level.grid[x][y-1] + this.state.world.level.grid[x+1][y] === 2) {
							ctx.moveTo(x1, y1);
							ctx.lineTo(x2, y1);
							ctx.lineTo(x2, y2);
							ctx.quadraticCurveTo(x1, y2, x1, y1);
						} 
						ctx.closePath();
						ctx.fill();
					}
					
					//ctx.fillRect(x * this.state.world.level.squareSize, y * this.state.world.level.squareSize,this.state.world.level.squareSize, this.state.world.level.squareSize);
					
				}
			}
			ctx.fillStyle = "rgb(80, 80, 80)";
			ctx.strokeStyle = "rgb(50, 50, 50)";
			var origShadowColor = ctx.shadowColor;
			ctx.shadowColor = "rgb(50, 50, 50)";
			ctx.shadowBlur = 16;
			this.state.world.level.rocks.map((rock) => {
				ctx.beginPath();
				ctx.arc(rock.pos[0], rock.pos[1], rock.radius, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.stroke();
			});
			ctx.shadowColor = origShadowColor;
		}
	}
	
	renderMap(bgctx, ctx) {
		bgctx.clearRect(0, 0, width, height);
		ctx.clearRect(0, 0, width, height);
		this.tracecanvas.getContext("2d").clearRect(0, 0, width, height);
		bgctx.fillStyle = this.state.world.level.colors[0];
		bgctx.fillRect(0, 0, width, height);
		this.renderLand(ctx);
	}
	
	drawTire(ctx, tiresize, dubbs, spikes, driving) {
		ctx.fillStyle = "rgb(20, 20, 5)";
		ctx.fillRect(-tiresize[0]/2, -tiresize[1]/2, tiresize[0], tiresize[1]);
		if(spikes || dubbs) {
			if(spikes === true) {
				ctx.strokeStyle = "rgb(220, 220, 220)";
			} else if(dubbs === true) {
				ctx.strokeStyle = "rgb(90, 90, 90)";
			}
			var offset = 1;
			if(driving !== 0) {
				offset = Math.floor((Date.now() % 100) / 50);
			}
			ctx.beginPath();
			ctx.moveTo(1-tiresize[0]/2, offset-tiresize[1]/2);
			ctx.lineTo(tiresize[0]/2-1, offset-tiresize[1]/2);
			
			ctx.moveTo(1-tiresize[0]/2, offset);
			ctx.lineTo(tiresize[0]/2-1, offset);
			ctx.stroke();
		}
	}
	
	drawTires(ctx, size, tiresize, dubbs, spikes, driving, turning) {
		ctx.save();
		ctx.translate(-size[0]/2, -size[1]/2 + tiresize[1]/2);
		this.drawTire(ctx, tiresize, dubbs, spikes, driving);
		ctx.translate(size[0], 0);
		this.drawTire(ctx, tiresize, dubbs, spikes, driving);
		ctx.restore();
		
		
		ctx.save();
		ctx.translate(-size[0]/2, size[1]/2 - tiresize[1]/2);
		ctx.rotate(turning*0.3);
		this.drawTire(ctx, tiresize, dubbs, spikes, driving);
		ctx.restore();
		ctx.save();
		ctx.translate(size[0]/2, size[1]/2 - tiresize[1]/2);
		ctx.rotate(turning*0.3);
		this.drawTire(ctx, tiresize, dubbs, spikes, driving);
		ctx.restore();
	}
	
	drawBody(ctx, size, color) {
		ctx.fillStyle = color;
		ctx.fillRect(-size[0]/2, -size[1]/2, size[0], size[1]);
		
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "white";
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(-size[0]/2, -size[1]/2);
		ctx.lineTo(0, 0);
		ctx.lineTo(size[0]/2, -size[1]/2);
		ctx.fill();
		ctx.globalAlpha = 0.7;
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
	
	drawRocketLauncher(ctx, towerrotation, tripple) {
		ctx.save();
		ctx.fillStyle = "rgb(130, 100, 100)";
		ctx.strokeStyle = "rgb(170, 170, 170)";
		ctx.translate(0, -4);
		
		if(tripple) {
			ctx.save();
			ctx.rotate(towerrotation-0.4);
			ctx.fillRect(-2, 0, 4, 8);
			ctx.beginPath();
			ctx.moveTo(-1, 0);
			ctx.lineTo(-1, 8);
			ctx.stroke();
			
			
			ctx.rotate(0.8);
			ctx.fillRect(-2, 0, 4, 8);
			ctx.beginPath();
			ctx.moveTo(-1, 0);
			ctx.lineTo(-1, 8);
			ctx.stroke();
			ctx.restore();
		}
		
		ctx.rotate(towerrotation);
		ctx.fillRect(-2, 0, 4, 8);
		ctx.beginPath();
		ctx.moveTo(-1, 0);
		ctx.lineTo(-1, 8);
		ctx.stroke();
		
		ctx.restore();
	}
	
	drawBumper(ctx, player) {
		ctx.fillStyle = "rgb(90, 90, 90)";
		ctx.beginPath();
		ctx.moveTo(-player.size[0]/2, player.size[1]/2);
		ctx.lineTo(-player.size[0]/2, player.size[1]/2 + 1);
		ctx.lineTo(-player.size[0]/2 + 2, player.size[1]/2 + 2);
		ctx.lineTo(player.size[0]/2 - 2, player.size[1]/2 + 2);
		ctx.lineTo(player.size[0]/2, player.size[1]/2 + 1);
		ctx.lineTo(player.size[0]/2, player.size[1]/2);
		ctx.fill();
	}
	drawPontons(ctx, player) {
		ctx.fillStyle = "grey";
		ctx.fillRect(-player.size[0]/2 - 2, -3, 2, 6);
		ctx.fillRect(player.size[0]/2, -3, 2, 6);
	}
	drawNose(ctx, player) {
		ctx.fillStyle = "grey";
		ctx.beginPath();
		ctx.moveTo(-player.size[0]/2 + 2, player.size[1]/2-2);
		ctx.lineTo(0, player.size[1]/2 + 5);
		ctx.lineTo(player.size[0]/2 - 2, player.size[1]/2-2);
		ctx.fill();
	}
	drawLaser(ctx, player) {
		ctx.save();
		
		
		var start = sub(copy(player.pos), mult(rad2dir(player.rotation), 4));
		var length = 500;
		var stop = add(copy(start), mult(rad2dir(player.rotation + player.towerrotation), length));
		var gradient = ctx.createLinearGradient(start[0], start[1], stop[0], stop[1]);
		gradient.addColorStop("0", "rgba(255, 0, 0, 0.0)");
		gradient.addColorStop("0.1", "rgba(255, 0, 0, 0.75)");
		gradient.addColorStop("1.0", "rgba(255, 0, 0, 0.0)");
		if(this.state.world.level !== undefined) {
			this.state.world.level.rocks.map((rock) => {
				if (dist(rock.pos, start) - rock.radius < length ) {
					var point = getClosestPointOnSegment(start, stop, rock.pos);
					var offsetFromRockCenter = dist(point, rock.pos);
					if(offsetFromRockCenter <= rock.radius) {
						var offset = Math.sqrt(rock.radius*rock.radius - offsetFromRockCenter*offsetFromRockCenter);
						length = dist(point, start) - offset;
						stop = add(copy(start), mult(rad2dir(player.rotation + player.towerrotation), length));
					}
				}
			});
			this.state.world.players.map((other) => {
				var playerRadius = other.size[0] - 3;
				if (dist(other.pos, start) - playerRadius < length && other !== player) {
					var point = getClosestPointOnSegment(start, stop, other.pos);
					var offsetFromPlayerCenter = dist(point, other.pos);
					if(offsetFromPlayerCenter <= playerRadius) {
						var offset = Math.sqrt(playerRadius*playerRadius - offsetFromPlayerCenter*offsetFromPlayerCenter);
						length = dist(point, start) - offset;
						stop = add(copy(start), mult(rad2dir(player.rotation + player.towerrotation), length));
					}
				}
			});
		}
		
		
		ctx.strokeStyle = gradient;
		ctx.beginPath();
		ctx.moveTo(start[0], start[1]);
		ctx.lineTo(stop[0], stop[1]);
		ctx.stroke();
		if(length < 500) {
			ctx.fillStyle = "red";
			ctx.beginPath();
			ctx.arc(stop[0], stop[1], 2, 0, Math.PI*2, true);
			ctx.fill();
		}
		ctx.restore();
	}
	drawParachute(ctx, player) {
		ctx.fillStyle = player.color;
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(player.pos[0], player.pos[1]);
		ctx.lineTo(player.parachute.pos[0], player.parachute.pos[1]);
		ctx.stroke();
		
		
		ctx.save();
		ctx.translate(player.parachute.pos[0], player.parachute.pos[1]);
		ctx.rotate(player.parachute.rotation);
		ctx.beginPath();
		ctx.arc(0, 0, 15, 0, Math.PI, true);
		ctx.moveTo(-15, 0);
		ctx.lineTo(15, 0);
		ctx.fill();
		ctx.moveTo(-15, 0);
		ctx.restore();
		ctx.lineTo(player.pos[0], player.pos[1]);
		ctx.save();
		ctx.translate(player.parachute.pos[0], player.parachute.pos[1]);
		ctx.rotate(player.parachute.rotation);
		ctx.moveTo(15, 0);
		ctx.restore();
		ctx.lineTo(player.pos[0], player.pos[1]);
		ctx.stroke();
		
		ctx.save();
		ctx.translate(player.parachute.pos[0], player.parachute.pos[1]);
		ctx.rotate(player.parachute.rotation);
		ctx.beginPath();
		ctx.arc(0, 0, 15, 0, -Math.PI/3, true);
		ctx.lineTo(0, 0);
		ctx.arc(0, 0, 15, -Math.PI/3, -Math.PI/3*2, true);
		ctx.lineTo(0, 0);
		ctx.stroke();
		ctx.restore();
	}
	
	drawPlayers(ctx, ctx2, ctx3) {
		this.state.world.players.map((player) => {
			if(player.alive) {
				ctx.save();
				ctx.translate(player.pos[0], player.pos[1]);
				ctx.rotate(player.rotation);
				
				ctx2.save();
				ctx2.translate(player.pos[0], player.pos[1]);
				ctx2.rotate(player.rotation);
				ctx2.globalAlpha = 1;
				
				ctx2.shadowColor = 'black';
				ctx2.shadowBlur = 3;
				this.drawTires(ctx2, player.size, [player.tiresize[0]-3,player.tiresize[1]-3], false, false, player.driving, player.turning);
				ctx2.restore();
				
				ctx3.save();
				ctx3.translate(player.pos[0], player.pos[1]);
				ctx3.rotate(player.rotation);
				ctx3.globalAlpha = 1;
				
				ctx3.shadowColor = player.color;
				ctx3.shadowBlur = 3;
				this.drawTires(ctx3, player.size, [player.tiresize[0]-3,player.tiresize[1]-3], false, false, player.driving, player.turning);
				ctx3.restore();
				
				this.drawBody(ctx, player.size, player.color);
				this.drawTires(ctx, player.size, player.tiresize, player.dubbs, player.spikes, player.driving, player.turning);
				if(player.rockets) {
					this.drawRocketLauncher(ctx, player.towerrotation, player.tripple);
				}
				
				if(player.bumper === true) {
					this.drawBumper(ctx, player);
				}
				if(player.pontons === true) {
					this.drawPontons(ctx, player);
				}
				if(player.nose === true) {
					this.drawNose(ctx, player);
				}
				ctx.restore();
				
				if(this.outsideScreen(player.pos)) {
					const arrowRadius = 15;
					ctx.save();
					ctx.globalAlpha = 0.75;

					var x = Math.min(Math.max(player.pos[0], arrowRadius), width-arrowRadius);
					var y = Math.min(Math.max(player.pos[1], arrowRadius), height-arrowRadius);
					ctx.translate(x, y);
					
					ctx.rotate(player.rotation);
					ctx.fillStyle = player.color;
					ctx.strokeStyle = "black";
					
					ctx.beginPath();
					ctx.moveTo(-arrowRadius/2, -arrowRadius);
					ctx.lineTo(arrowRadius/2, -arrowRadius);
					ctx.lineTo(arrowRadius/2, 0);
					ctx.lineTo(arrowRadius, 0);
					ctx.lineTo(0, arrowRadius);
					ctx.lineTo(-arrowRadius, 0);
					ctx.lineTo(-arrowRadius/2, 0);
					ctx.lineTo(-arrowRadius/2, -arrowRadius);
					ctx.fill();
					ctx.stroke();
					
					ctx.globalAlpha = 1;
					ctx.restore();
				}
			}
		});
	}
	
	drawCritters(ctx, ctx2) {
		ctx.fillStyle = "rgb(80, 80, 180)";
		ctx2.shadowColor = 'grey';
		ctx2.shadowBlur = 1;
		ctx2.fillStyle = 'grey';
		
		ctx.globalAlpha = 0.7;
		this.state.world.critters.map((critter) => {
			ctx.save();
			ctx.translate(critter.pos[0], critter.pos[1]);
			ctx.rotate(critter.rotation);
			ctx.strokeStyle = "rgb(50, 50, 50)";
			ctx.beginPath();
			ctx.arc(0, 0, 4, 0, 2 * Math.PI, false);
			ctx.moveTo(0, 6);
			ctx.lineTo(0, 3);
			ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.strokeStyle = "rgb(200, 200, 200)";
			ctx.moveTo(-2, 0);
			ctx.lineTo(-2, 1);
			ctx.moveTo(2, 1);
			ctx.lineTo(2, 0);
			ctx.stroke();
			ctx.restore();
			
			ctx2.save();
			ctx2.translate(critter.pos[0], critter.pos[1]);
			ctx2.rotate(critter.rotation);
			ctx2.globalAlpha = 1;
			
			ctx2.beginPath();
			ctx2.arc(0, 0, 1, 0, 2 * Math.PI, false);
			ctx2.fill();
			ctx2.restore();
		});
		ctx.globalAlpha = 1;
		
	}
	
	outsideScreen(pos) {
		return pos[0] < 0 || pos[0] > width || pos[1] < 0 || pos[1] > height;
	}
	
	drawShop(ctx) {
		if(this.state.world.level  !== undefined && this.state.world.level.shop !== undefined) {
			ctx.save();
			ctx.translate(this.state.world.level.shop.pos[0], this.state.world.level.shop.pos[1]);
			ctx.fillStyle = "rgb(100, 180, 250)";
			ctx.strokeStyle = "rgb(50, 50, 50)";
			ctx.beginPath();
			ctx.arc(0, 0, this.state.world.level.shop.radius, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "rgb(130, 170, 240)";
			ctx.beginPath();
			ctx.arc(0, 0, this.state.world.level.shop.radius/3, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.stroke();
			ctx.save();
			const boxCount = 6;
			const boxSize = 16;
			for(var i = 0; i<boxCount; i++) {
				ctx.rotate(Math.PI*2/boxCount);
				ctx.fillRect(this.state.world.level.shop.radius-boxSize/2-4, -boxSize/2, boxSize, boxSize);
				ctx.strokeRect(this.state.world.level.shop.radius-boxSize/2-4, -boxSize/2, boxSize, boxSize);
			}
			ctx.restore();
			ctx.lineWidth = 1;
			ctx.fillStyle = "rgb(100, 180, 250)";
			ctx.font = "900 22px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Shop", 0, -10);
			ctx.strokeText("Shop", 0, -10);
			ctx.restore();
		}
	}
	
	drawScraps(ctx) {
		this.state.world.scraps.map((scrap) => {
			ctx.save();
			ctx.fillStyle = "rgb(190, 190, 190)";
			ctx.strokeStyle = "rgb(100, 100, 100)";
			ctx.translate(scrap.pos[0], scrap.pos[1]);
			ctx.rotate((Date.now() % 1500) / 1500 * 2 * Math.PI);
			var scale = Math.sin(Date.now() / 500) * 0.2 + 1;
			ctx.scale(scale, scale);
			ctx.fillRect(-3, -3, 6, 6);
			ctx.strokeRect(-3, -3, 6, 6);
			ctx.restore();
		});
	}
	
	drawProjectiles(ctx) {
		this.state.world.projectiles.map((projectile) => {
			ctx.save();
			ctx.fillStyle = "rgb(220, 40, 40)";
			ctx.translate(projectile.pos[0], projectile.pos[1]);
			ctx.rotate(projectile.rotation);
			ctx.fillRect(-2, -2, 4, 4);
			ctx.restore();
		});
	}
	
	drawEffects(ctx) {
		ctx.strokeStyle = "black";
		this.state.world.effects.map((effect) => {
			ctx.globalAlpha = (1-effect.progress) * 0.7;
			effect.particles.map((particle) => {
				ctx.fillStyle = particle.color;
				ctx.beginPath();
				ctx.arc(particle.pos[0], particle.pos[1], particle.radius, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.stroke();
			});
		});
		ctx.globalAlpha = 1;
		ctx.restore();
		this.state.world.players.map((player) => {
			if(player.alive) {
				if(player.laser === true) {
					this.drawLaser(ctx, player);
				}
				if(player.parachute) {
					this.drawParachute(ctx, player);
				}
			}	
		});
	}
	
	drawNotification(ctx) {
		if(this.state.world.notification !== undefined) {
			ctx.globalAlpha = 1 - (Date.now() % 500) / 500;
			ctx.strokeStyle = "red";
			ctx.beginPath();
			ctx.arc(this.state.world.notification.pos[0], 
					this.state.world.notification.pos[1], 
					this.state.world.notification.radius - (Date.now() % 500) / 500 * this.state.world.notification.radius, 
					0, 2 * Math.PI, false);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}
	
	drawMessage(ctx) {
		if(this.state.world.msg) {
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "black";
			ctx.fillRect(0, height/2-50, width, 100);
			ctx.globalAlpha = 1;
			ctx.font = "32px Arial";
			ctx.fillStyle = "white";
			ctx.textAlign = "center";
			ctx.fillText(this.state.world.msg, width/2, height/2 + 16);
		}
	}
	
	update() {
		var ctx = this.canvas.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		
		this.drawMap(ctx);
		this.drawCritters(ctx, this.tracecanvas.getContext("2d"));
		this.drawPlayers(ctx, this.tracecanvas.getContext("2d"), this.tracecanvas2.getContext("2d"));
		this.drawShop(ctx);
		this.drawScraps(ctx);
		this.drawProjectiles(ctx);
		this.drawEffects(ctx);
		this.drawNotification(ctx);
		this.drawMessage(ctx);
		//this.drawParachute(ctx, {
		//	color: "red",
		//	pos: [200, 200],
		//	parachute: {
		//		pos: [ 240, 240],
		//		rotation: 3,
		//	},
		//
		//});
	}
	
	keydown(e) {
		Socket.keydown(e.keyCode);
		if(e.keyCode != 116) {
			e.preventDefault();
		}
	}
	keyup(e) {
		Socket.keyup(e.keyCode);
		if(e.keyCode != 116) {
			e.preventDefault();
		
		}
	}
	
	onWorldUpdate(msg) {
		var update = JSON.parse(msg);
		this.state.world.players = update.players;
		this.state.world.projectiles = update.projectiles;
		this.state.world.scraps = update.scraps;
		this.state.world.effects = update.effects;
		this.state.world.critters = update.critters;
		this.setState({
			world: this.state.world
		});
	}
	
	onNewMap(msg) {
		console.log("Got new map!");
		var level = JSON.parse(msg);
		this.state.world.level = level;
		this.renderMap(this.bgcanvas.getContext("2d"), this.mapcanvas.getContext("2d"));
		this.setState({
			world: this.state.world
		});
		
	}
	onGameUpdate(msg) {
		var game = JSON.parse(msg);
		this.state.world.msg = game.msg;
		this.setState(this.state);
	}
	onHudUpdate(msg) {
		var hud = JSON.parse(msg);
		this.state.world.notification = hud.notification;
		if(this.shop && hud.shopping != this.shop.state.visible) {
			this.shop.setVisible(hud.shopping);
		}
		this.setState(this.state);
	} 
	
	componentDidMount(){
		console.log(this.shop);
		Socket.setOnWorldUpdate(this.onWorldUpdate.bind(this));
		Socket.setOnNewMap(this.onNewMap.bind(this));
		Socket.addOnGameUpdate(this.onGameUpdate.bind(this));
		Socket.addOnHudUpdate(this.onHudUpdate.bind(this));
		window.addEventListener('keydown', this.keydown, true);
		window.addEventListener('keyup', this.keyup, true);
		var intervalId = setInterval(this.update.bind(this), 16.666);
		this.setState({ intervalId: intervalId });
	}

	componentWillUnmount(){
		clearInterval(this.state.intervalId);
	}
}

export default Game;