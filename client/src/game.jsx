import React from 'react';
import Socket from './socket'
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

const width = 800;
const height = 600;

class Game extends React.Component { 

	constructor() {
		super();
		this.state = {
			world: {
				players: [],
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
				<canvas className="canvas" width={width} height={height} ref={node => this.tracecanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.bgcanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.mapcanvas = node} ></canvas>
				<canvas className="canvas" width={width} height={height} ref={node => this.canvas = node} ></canvas>
			</div>
		);
    }
	
	drawMap(ctx) {
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
	
	drawPlayers(ctx, ctx2) {
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
				
				this.drawBody(ctx, player.size, player.color);
				this.drawTires(ctx, player.size, player.tiresize, player.dubbs, player.spikes, player.driving, player.turning);
				if(player.rockets) {
					this.drawRocketLauncher(ctx, player.towerrotation, player.tripple);
				}
				
				if(player.bumper === true) {
					ctx.fillStyle = "grey";
					ctx.beginPath();
					ctx.moveTo(-player.size[0]/2, player.size[1]/2);
					ctx.lineTo(-player.size[0]/2, player.size[1]/2 + 1);
					ctx.lineTo(-player.size[0]/2 + 2, player.size[1]/2 + 3);
					ctx.lineTo(player.size[0]/2 - 2, player.size[1]/2 + 3);
					ctx.lineTo(player.size[0]/2, player.size[1]/2 + 1);
					ctx.lineTo(player.size[0]/2, player.size[1]/2);
					ctx.fill();
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
	
	outsideScreen(pos) {
		return pos[0] < 0 || pos[0] > width || pos[1] < 0 || pos[1] > height;
	}
	
	drawShop(ctx) {
		if(this.state.world.level  !== undefined && this.state.world.level.shop !== undefined) {
			ctx.save();
			ctx.translate(this.state.world.level.shop.pos[0], this.state.world.level.shop.pos[1]);
			ctx.fillStyle = "rgb(100, 100, 190)";
			ctx.strokeStyle = "rgb(50, 50, 50)";
			ctx.beginPath();
			ctx.arc(0, 0, this.state.world.level.shop.radius, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.stroke();
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
	}
	
	drawNotification(ctx) {
		if(this.state.world.notification !== undefined) {
			ctx.globalAlpha = (Date.now() % 500) / 500;
			ctx.strokeStyle = "red";
			ctx.beginPath();
			ctx.arc(this.state.world.notification.pos[0], 
					this.state.world.notification.pos[1], 
					this.state.world.notification.radius - (Date.now() % 500) / 500 * 5, 
					0, 2 * Math.PI, false);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}
	
	drawMessage(ctx) {
		ctx.font = "30px Arial";
		ctx.fillStyle = "red";
		ctx.strokeStyle = "black";
		ctx.textAlign = "center";
		ctx.fillText(this.state.world.msg, width/2, height/2);
		ctx.strokeText(this.state.world.msg, width/2, height/2);
	}
	
	update() {
		var ctx = this.canvas.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		var ctx2 = this.tracecanvas.getContext("2d");
		
		this.drawMap(ctx);
		this.drawPlayers(ctx, ctx2);
		this.drawShop(ctx);
		this.drawScraps(ctx);
		this.drawProjectiles(ctx);
		this.drawEffects(ctx);
		this.drawNotification(ctx);
		this.drawMessage(ctx);
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
	onHudUpdate(hud) {
		this.state.world.notification = JSON.parse(hud).notification;
		this.setState(this.state);
	} 
	
	componentDidMount(){
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