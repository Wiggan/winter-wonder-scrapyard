var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var dist = require('vectors/dist')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var chance = require('chance').Chance();
require('./utility.js');

module.exports = class LevelGenerator {
	
	constructor(io) {
		this.io = io;
	}
	
	generate(width, height, arena) {
		this.width = width;
		this.height = height;
		this.squareSize = 60;
		this.cols = Math.round(this.width / this.squareSize);
		this.rows = Math.round(this.height / this.squareSize);
		this.randomFill();
		this.smooth();
		this.explode();
		this.explode();
		this.rocks = [];
		this.critters = [];
		if(arena) {
			this.shop = undefined;
		} else {
			this.shop = this.addShop();
		}
		this.addRocks();
		this.addCritters();
		console.log(this.critters);
		return {
			squareSize: this.squareSize,
			grid: this.grid,
			colors: ["rgb(0, 80, 255)", "rgb(150, 190, 255)", "rgb(50, 50, 50)"],
			rocks: this.rocks,
			shop: this.shop,
			critters: this.critters
		}
	}

	randomFill() {
		this.grid = []
		for(var x = 0; x < this.cols; x++) {
			this.grid.push([]);
			for(var y = 0; y < this.rows; y++) {
				this.grid[x].push(0);
			}
		}
		for(var x = 1; x < this.cols-1; x++) {
			for(var y = 1; y < this.rows-1; y++) {
				this.grid[x][y] = 1;
			}
		}
		for(var x = 1; x < this.cols-1; x++) {
			for(var y = 1; y < this.rows-1; y++) {
				if(Math.random() < 0.3) {
					this.grid[x][y] = getRandomIntInclusive(0, 1);
				}
			}
		}
	}
	
	smooth() {
		for(var x = 1; x < this.cols-1; x++) {
			for(var y = 1; y < this.rows-1; y++) {
				var count = this.getNeighborCount(x, y);
				if (count < 4) {
					this.grid[x][y] = 0;
				} else if (count > 4) {
					this.grid[x][y] = 1;
				}
			}
		}
	}
	
	getNeighborCount(x, y) {
		var count = 0;
		count += this.grid[x-1][y-1];
		count += this.grid[x][y-1];
		count += this.grid[x+1][y-1];
		count += this.grid[x][y-1];
		count += this.grid[x][y+1];
		count += this.grid[x-1][y+1];
		count += this.grid[x][y+1];
		count += this.grid[x+1][y+1];
		return count;
	}
	
	explode() {
		var newgrid = [];
		for(var x = 0; x < this.cols; x++) {
			newgrid.push([]);
			newgrid.push([]);
			for(var y = 0; y < this.rows; y++) {
				newgrid[x*2].push(this.grid[x][y]);
				newgrid[x*2].push(this.grid[x][y]);
				newgrid[x*2+1].push(this.grid[x][y]);
				newgrid[x*2+1].push(this.grid[x][y]);
			}
		}
		this.grid = newgrid;
		this.squareSize = this.squareSize / 2;
		this.rows = this.rows * 2;
		this.cols = this.cols * 2;
	}
	
	addRocks() {
		var rockClusterCount = getRandomIntInclusive(4, 6);
		for(var i = 0; i < rockClusterCount; i++) {
			this.rocks.push({
				pos: this.getCollisionFreePosition(),
				radius: getRandomIntInclusive(15, 20),
			});
			var rockCount = getRandomIntInclusive(5, 10);
			for(var j = 1; j < rockCount; j++) {
				var pos = add(mult(rad2dir(Math.random() * 2 * Math.PI), this.rocks[this.rocks.length-1].radius*2), this.rocks[this.rocks.length-1].pos);
				this.rocks.push({
					pos: pos,
					radius: getRandomIntInclusive(10-j, 15-j),
				});
			}
		}
	}
	
	addCritters() {
		var critterClusterCount = getRandomIntInclusive(1, 3);
		for(var i = 0; i < critterClusterCount; i++) {
			var rotation = Math.random() * 2 * Math.PI;
			var leader = {
				pos: this.getCollisionFreePosition(),
				cluster: i,
				rotation: rotation,
				vel: mult(rad2dir(rotation), getRandomIntInclusive(1, 3)),
				acc: [0, 0]
			};
			this.critters.push(leader);
			var critterCount = getRandomIntInclusive(4, 8);
			for(var j = 1; j < critterCount; j++) {
				var pos = add(mult(rad2dir(j / (critterCount-1) * 2 * Math.PI), getRandomIntInclusive(4, 8)), leader.pos);
				this.critters.push({
					pos: pos,
					cluster: i,
					rotation: Math.random() * 2 * Math.PI,
					vel: [0, 0],
					acc: [0, 0]
				});
			}
		}
	}
	
	addShop() {
		var candidate = [getRandomIntInclusive(Math.floor(this.width/3), 2*Math.floor(this.width/3)), getRandomIntInclusive(Math.floor(this.height/3), 2*Math.floor(this.height/3))];
		while(this.isInWater(candidate) === true) {
			candidate = [getRandomIntInclusive(Math.floor(this.width/3), 2*Math.floor(this.width/3)), getRandomIntInclusive(Math.floor(this.height/3), 2*Math.floor(this.height/3))];
		}
		for(var i=0; i<5; i++) {
			this.rocks.push({
				pos: add(copy(candidate), mult(rad2dir(Math.PI + Math.PI/10*i + Math.random()*0.2), getRandomIntInclusive(40, 50))),
				radius: getRandomIntInclusive(5, 15),
			});		
		}
		for(var i=0; i<4; i++) {
			this.rocks.push({
				pos: add(copy(candidate), mult(rad2dir(Math.PI/10*i + Math.random()*0.2), getRandomIntInclusive(40, 50))),
				radius: getRandomIntInclusive(5, 15),
			});		
		}
		return {
			pos: candidate,
			radius: 30,
		};
	}
	
	outsideScreen(pos) {
		return pos[0] < 0 || pos[0] > this.width || pos[1] < 0 || pos[1] > this.height;
	}
	
	isInWater(pos) {
		try {
		var x = Math.floor(pos[0]/this.squareSize);
		var y = Math.floor(pos[1]/this.squareSize);
		if(x < 0 || x >= this.grid.length || y < 0 || y > this.grid[0].length) {
			return true;
		}
		return this.outsideScreen(pos) || this.grid[x][y] === 0;
		} catch(err) {
			console.log(pos);
			console.log(this.grid);
			console.log(this.squareSize);
			process.exit(1);
		}
	}

	isCollidingWithMapElements(pos) {
		var result = false;
		this.rocks.map((rock) => {
			if(dist(rock.pos, pos) < rock.radius*3) {
				result = true;
			}
		});
		if(this.shop !== undefined) {
			if(dist(this.shop.pos, pos) < this.shop.radius*3) {
				result = true;
			}
		}
		return result;
	}
	
	isCollidingWithPlayers(pos) {
		var result = false;
		Object.values(this.io.sockets.sockets).map((socket) => {
			if(socket.player !== undefined && dist(socket.player.status.pos, pos) < socket.player.status.size[1]*3) {
				result = true;
			}
		});
		return result;
	}
	
	getCollisionFreePosition() {
		var candidate = [chance.floating({ min: this.squareSize, max: this.width-this.squareSize }), chance.floating({ min: this.squareSize, max: this.height-this.squareSize })];
		while(this.isCollidingWithMapElements(candidate) === true || 
			  this.isInWater(candidate) === true ||
			  this.isCollidingWithPlayers(candidate) === true) {
			candidate = [chance.floating({ min: this.squareSize, max: this.width-this.squareSize }), chance.floating({ min: this.squareSize, max: this.height-this.squareSize })];
		}
		return candidate;
	}
	
	getInwardRotation(pos) {
		var a = Math.atan2(this.height/2 - pos[1], this.width/2 - pos[0]) - Math.PI/2;
		return a;
	}
}
