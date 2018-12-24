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

module.exports = class ParticleGenerator {
	generateSmoke(pos, scale) {
		var smoke = {
			birth: Date.now(),
			particles: [],
			duration: 1000,
			progress: 0,
		};
		var count = getRandomIntInclusive(5, 10);
		for(var i=0; i<count; i++) {
			var direction = rad2dir(Math.random()*2*Math.PI);
			var position = add(copy(pos), mult(copy(direction), getRandomIntInclusive(5, 10)));
			var particle = {
				radius: getRandomIntInclusive(5, 10)*scale,
				direction: direction,
				speed: Math.random()*0.5+0.2,
				pos: position,
				color: chance.color({grayscale: true, format: 'rgb'}),
			};
			smoke.particles.push(particle);
		}
		return smoke;
	}
	
	generateExplosion(pos) {
		var explosion = {
			birth: Date.now(),
			particles: [],
			duration: 2000,
			progress: 0,
		};
		var count = getRandomIntInclusive(5, 10);
		for(var i=0; i<count; i++) {
			var direction = rad2dir(Math.random()*2*Math.PI);
			var position = add(copy(pos), mult(copy(direction), getRandomIntInclusive(3, 6)));
			var particle = {
				radius: getRandomIntInclusive(3, 8),
				direction: direction,
				speed: Math.random()*0.5+0.2,
				pos: position,
				color: "rgb("+getRandomIntInclusive(128,255)+","+getRandomIntInclusive(0,100)+",0)",
			};
			explosion.particles.push(particle);
		}
		return explosion;
	}
	
	generateGold(pos) {
		var gold = {
			birth: Date.now(),
			particles: [],
			duration: 1000,
			progress: 0,
		};
		var count = 8;
		for(var i=0; i<count; i++) {
			var direction = rad2dir(Math.random()*2*Math.PI);
			var position = add(copy(pos), mult(copy(direction), getRandomIntInclusive(3, 6)));
			var brightness = getRandomIntInclusive(128,255);
			var particle = {
				radius: getRandomIntInclusive(3, 5),
				direction: direction,
				speed: Math.random()*0.5+0.2,
				pos: position,
				color: "rgb("+brightness+","+brightness*0.7+",0)",
			};
			gold.particles.push(particle);
		}
		return gold;
	}
	
	generateScrapSpawn(pos, count) {
		var gold = {
			birth: Date.now(),
			particles: [],
			duration: 700,
			progress: 0,
		};
		for(var i=0; i<count; i++) {
			var direction = rad2dir(Math.random()*2*Math.PI);
			var position = add(copy(pos), mult(copy(direction), getRandomIntInclusive(3, 5)));
			var brightness = getRandomIntInclusive(180,230);
			var particle = {
				radius: getRandomIntInclusive(4, 6),
				direction: direction,
				speed: Math.random()*0.6+0.2,
				pos: position,
				color: "rgb("+brightness+","+brightness*0.9+",0)",
			};
			gold.particles.push(particle);
		}
		return gold;
	}
}
