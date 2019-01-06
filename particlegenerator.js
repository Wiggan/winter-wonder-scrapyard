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
	
	generateDust(pos, direction) {
		var dust = {
			birth: Date.now(),
			particles: [],
			duration: 200,
			progress: 0,
		};
		var count = getRandomIntInclusive(2, 3);
		var rotation = dir2rad(direction);
		for(var i=0; i<count; i++) {
			var particleDir = rad2dir(rotation + (Math.random() - 0.5)*3);
			var position = add(copy(pos), mult(copy(particleDir), getRandomIntInclusive(10, 15)));
			var brightness = getRandomIntInclusive(100,250);
			var particle = {
				radius: getRandomIntInclusive(2, 3),
				direction: particleDir,
				speed: 0.5,
				pos: position,
				color: "rgb("+brightness*0.8+","+brightness*0.8+","+brightness+")",
			};
			dust.particles.push(particle);
		}
		return dust;
	}
	
	generateBlood(pos, direction) {
		var blood = {
			birth: Date.now(),
			particles: [],
			duration: 500,
			progress: 0,
		};
		var count = getRandomIntInclusive(6, 9);
		var rotation = dir2rad(direction);
		for(var i=0; i<count; i++) {
			var particleDir = rad2dir(rotation + (Math.random() - 0.5)*3);
			var position = add(copy(pos), mult(copy(particleDir), getRandomIntInclusive(10, 15)));
			var particle = {
				radius: getRandomIntInclusive(2, 3),
				direction: particleDir,
				speed: 0.5,
				pos: position,
				color: "rgb("+getRandomIntInclusive(200, 255)+","+getRandomIntInclusive(0, 80)+",0)",
			};
			blood.particles.push(particle);
		}
		return blood;
	}
	
	generateBloodStain(pos) {
		var blood = {
			birth: Date.now(),
			particles: [],
			duration: 3000,
			progress: 0,
		};
		var count = getRandomIntInclusive(3, 4);
		for(var i=0; i<count; i++) {
			var position = add(copy(pos), mult(rad2dir(Math.random() * Math.PI * 2), getRandomIntInclusive(5, 10)));
			var particle = {
				radius: getRandomIntInclusive(5, 8),
				direction: [1, 0],
				speed: 0,
				pos: position,
				color: "rgb("+getRandomIntInclusive(100, 200)+","+getRandomIntInclusive(0, 20)+",0)",
			};
			blood.particles.push(particle);
		}
		return blood;
	}
}
