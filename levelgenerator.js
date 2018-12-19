var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var dist = require('vectors/dist')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);
var chance = require('chance').Chance();

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}
function rad2dir(rad) {
	return [-Math.sin(rad), Math.cos(rad)];
}

module.exports = class LevelGenerator {
	
	generate(width, height) {
		this.width = width;
		this.height = height;
		this.squareSize = 40;
		this.cols = Math.round(this.width / this.squareSize);
		this.rows = Math.round(this.height / this.squareSize);
		this.randomFill();
		this.smooth();
		this.explode();
		this.explode();
		this.rocks = this.addRocks();
		
		return {
			squareSize: this.squareSize,
			grid: this.grid,
			colors: ["rgb(0, 80, 255)", "rgb(150, 190, 255)", "rgb(50, 50, 50)"],
			rocks: this.rocks,
		}
	}

	randomFill() {
		console.log("Running pass 1 with a grid of " + this.cols + "x" + this.rows);
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
		var rocks = [];
		for(var i = 0; i < rockClusterCount; i++) {
			rocks.push({
				pos: [getRandomIntInclusive(100, this.width-100), getRandomIntInclusive(50, this.height-50)],
				radius: getRandomIntInclusive(15, 20),
			});
			var rockCount = getRandomIntInclusive(5, 10);
			for(var j = 1; j < rockCount; j++) {
				var pos = add(mult(rad2dir(Math.random() * 2 * Math.PI), rocks[rocks.length-1].radius*2), rocks[rocks.length-1].pos);
				rocks.push({
					pos: pos,
					radius: getRandomIntInclusive(10-j, 15-j),
				});
			}
		}
		return rocks;
	}
	
	isInWater(pos) {
		return this.grid[Math.floor(pos[0]/this.squareSize)][Math.floor(pos[1]/this.squareSize)] === 0;
	}

	isCollidingWithMapElements(pos) {
		var result = false;
		this.rocks.map((rock) => {
			if(dist(rock.pos, pos) < rock.radius*3) {
				result = true;
			}
		});
		return result;
	}
	
	getCollisionFreePosition() {
		var candidate = [chance.floating({ min: this.squareSize, max: this.width-this.squareSize }), chance.floating({ min: this.squareSize, max: this.height-this.squareSize })];
		while(this.isCollidingWithMapElements(candidate) === true || this.isInWater(candidate) === true ) {
			candidate = [chance.floating({ min: this.squareSize, max: this.width-this.squareSize }), chance.floating({ min: this.squareSize, max: this.height-this.squareSize })];
		}
		return candidate;
	}
}
