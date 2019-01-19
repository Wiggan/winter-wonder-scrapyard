import React from 'react';
import openSocket from 'socket.io-client';

class Socket extends React.Component { 

	constructor() {
		super();
		console.log("Trying to connect to server on ip: " + window.location.hostname);
		this.socket = openSocket('http://' + window.location.hostname + ':3000');
		this.gameUpdateCallbacks = [];
		this.hudUpdateCallbacks = [];
		this.socket.on('game update', this.onGameUpdate.bind(this));
		this.socket.on('hud update', this.onHudUpdate.bind(this));
	}

	getShop() {
		this.socket.emit('get shop');
	}
	setOnShop(callback) {
		this.socket.on('get shop', callback);
	}
	buy(id) {
		this.socket.emit('buy', id);
	}
	setOnCoolDown(callback) {
		this.socket.on('cooldown', callback);
	}
	
	addOnHudUpdate(callback) {
		this.hudUpdateCallbacks.push(callback);
	}
	addOnGameUpdate(callback) {
		this.gameUpdateCallbacks.push(callback);
	}
	getHud() {
		this.socket.emit('get hud');
	}
	ready(name) {
		this.socket.emit('ready', name);
	}
	
	setOnNewMap(callback) {
		this.socket.on('new map', callback);
	}
	setOnWorldUpdate(callback) {
		this.socket.on('world update', callback);
	}
	setOnCountdownStarted(callback) {
		this.socket.on('countdown started', callback);
	}
	keydown(keyCode) {
		this.socket.emit('keydown', keyCode);
	}
	keyup(keyCode) {
		this.socket.emit('keyup', keyCode);
	}
	
	onGameUpdate(msg) {
		this.gameUpdateCallbacks.map((callback) => { return callback(msg) });
	}
	onHudUpdate(msg) {
		this.hudUpdateCallbacks.map((callback) => { return callback(msg) });
	}
	
}

export default new Socket();