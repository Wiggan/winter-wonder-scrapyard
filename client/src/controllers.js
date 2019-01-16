import React from 'react';
import Socket from './socket'

class Controllers extends React.Component {
	setup() {
		console.log("hej");
		window.addEventListener("gamepadconnected", function(e) {
			console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
				e.gamepad.index, e.gamepad.id,
				e.gamepad.buttons.length, e.gamepad.axes.length);
			var gamepad = navigator.getGamepads()[e.gamepad.index];
			console.log(gamepad);
		});
		
		window.addEventListener('keydown', this.keydown, true);
		window.addEventListener('keyup', this.keyup, true);
	}
	
		
	keydown(e) {
		Socket.keydown(e.keyCode);
		if(e.keyCode !== 116) {
			e.preventDefault();
		}
	}
	keyup(e) {
		Socket.keyup(e.keyCode);
		if(e.keyCode !== 116) {
			e.preventDefault();
		
		}
	}
	
}


export default new Controllers();