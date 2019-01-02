var mult = require('vectors/mult')(2);
var add = require('vectors/add')(2);
var sub = require('vectors/sub')(2);
var copy = require('vectors/copy')(2);
var norm = require('vectors/normalize')(2);
var dist = require('vectors/dist')(2);
var mag = require('vectors/mag')(2);
var dot = require('vectors/dot')(2);

global.rad2dir = function(rad) {
	return [-Math.sin(rad), Math.cos(rad)];
}

global.dir2rad = function(dir) {
	return Math.atan2(dir[1], dir[0]) - Math.PI/2;
}

global.epsilonGuard = function(number) {
	return (Math.round(( number )*10000))/10000
}

global.angle = function(a, b) {
	var angle = Math.acos(epsilonGuard(dot(a, b) / (mag(a) * mag(b))));
	if(isNaN(angle)) {
		console.log(dot(a, b));
		console.log(epsilonGuard(dot(a, b)));
		console.log(mag(a) * mag(b));
		console.log(epsilonGuard(mag(a) * mag(b)));
	}
	return angle;
}

global.scalarProjection = function(a, b) {
	return mag(a)*Math.cos(angle(a, b));
}

global.getRandomIntInclusive = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

global.getClosestPointOnSegment = function(start, stop, point) {
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