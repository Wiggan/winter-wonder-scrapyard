import React from 'react';
import Socket from './socket'

var KeyEnum = {
	forward: 87,
	backward: 83,
	left: 65,
	right: 68,
	brake: 32,
	boost: 69,
	parachute: 81,
	fire: 38,
	towerleft: 37,
	towerright: 39,
	leaveshop: 27
};
Object.freeze(KeyEnum);

function roundAxis(value) {
	const axisTreshold = 0.35;
	if(value < -axisTreshold) {
		return -1;
	} else if(value > axisTreshold) {
		return 1;
	} else {
		return 0;
	}
}

class Controllers extends React.Component {
	constructor() {
		super();
		this.hogAllInput = true;
	}
	
	setup() {
		
		window.addEventListener("gamepadconnected", function(e) {
			this.gamepad = navigator.getGamepads()[e.gamepad.index];
			console.log(this.gamepad);
			this.gamepad.previousButtons = this.gamepad.buttons.map((button) => {
				return button.pressed;
			});
			this.previousAxes = this.gamepad.axes.map((axis) => {
				return roundAxis(axis);
			});
			this.gamepadInterval = setInterval(() => {
				this.gamepad = navigator.getGamepads()[e.gamepad.index];
				var axes = this.gamepad.axes.map((axis) => {
					return roundAxis(axis);
				});
				
				if(this.previousAxes[0] !== axes[0]) {
					if(axes[0] === 1) {
						Socket.keyup(KeyEnum.left);
						Socket.keydown(KeyEnum.right);
					} else if(axes[0] === -1) {
						Socket.keyup(KeyEnum.right);
						Socket.keydown(KeyEnum.left);
					} else {
						Socket.keyup(KeyEnum.right);
						Socket.keyup(KeyEnum.left);
					}
				}
				
				if(this.previousAxes[2] !== axes[2]) {
					if(axes[2] === 1) {
						Socket.keyup(KeyEnum.towerleft);
						Socket.keydown(KeyEnum.towerright);
					} else if(axes[2] === -1) {
						Socket.keyup(KeyEnum.towerright);
						Socket.keydown(KeyEnum.towerleft);
					} else {
						Socket.keyup(KeyEnum.towerleft);
						Socket.keyup(KeyEnum.towerright);
					}
				}
				
				//if(this.previousAxes[1] !== axes[1]) {
				//	if(axes[1] === 1) {
				//		Socket.keyup(KeyEnum.forward);
				//		Socket.keydown(KeyEnum.backward);
				//	} else if(axes[1] === -1) {
				//		Socket.keyup(KeyEnum.backward);
				//		Socket.keydown(KeyEnum.forward);
				//	} else {
				//		Socket.keyup(KeyEnum.forward);
				//		Socket.keyup(KeyEnum.backward);
				//	}
				//}
				
				if(this.gamepad.buttons[7].pressed !== this.gamepad.previousButtons[7]) {
					if(this.gamepad.buttons[7].pressed) {
						Socket.keydown(KeyEnum.forward);
					} else {
						Socket.keyup(KeyEnum.forward);
					}
				}
				
				if(this.gamepad.buttons[6].pressed !== this.gamepad.previousButtons[6]) {
					if(this.gamepad.buttons[6].pressed) {
						Socket.keydown(KeyEnum.backward);
					} else {
						Socket.keyup(KeyEnum.backward);
					}
				}
				
				if(this.gamepad.buttons[1].pressed !== this.gamepad.previousButtons[1]) {
					if(this.gamepad.buttons[1].pressed) {
						Socket.keydown(KeyEnum.brake);
					} else {
						Socket.keyup(KeyEnum.brake);
					}
				}
				
				if(this.gamepad.buttons[0].pressed !== this.gamepad.previousButtons[0]) {
					if(this.gamepad.buttons[0].pressed) {
						Socket.keydown(KeyEnum.boost);
					} else {
						Socket.keyup(KeyEnum.boost);
					}
				}
			
				if(this.gamepad.buttons[4].pressed !== this.gamepad.previousButtons[4]) {
					if(this.gamepad.buttons[4].pressed) {
						Socket.keydown(KeyEnum.parachute);
					} else {
						Socket.keyup(KeyEnum.parachute);
					}
				}
			
				if(this.gamepad.buttons[2].pressed !== this.gamepad.previousButtons[2]) {
					if(this.gamepad.buttons[2].pressed) {
						Socket.keydown(KeyEnum.fire);
					} else {
						Socket.keyup(KeyEnum.fire);
					}
				}
			
				if(this.gamepad.buttons[8].pressed !== this.gamepad.previousButtons[8]) {
					if(this.gamepad.buttons[8].pressed) {
						Socket.keydown(KeyEnum.leaveshop);
					} else {
						Socket.keyup(KeyEnum.leaveshop);
					}
				}
				
				this.gamepad.previousButtons = this.gamepad.buttons.map((button) => {
					return button.pressed;
				});
				this.previousAxes = this.gamepad.axes.map((axis) => {
					return roundAxis(axis);
				});
			}, 16.666);
		});
		window.addEventListener("gamepaddisconnected", function(e) {
			clearInterval(this.gamepadInterval);
		});
		window.addEventListener('keydown', this.keydown.bind(this), true);
		window.addEventListener('keyup', this.keyup.bind(this), true);
		
	}
	
		
	keydown(e) {
		Socket.keydown(e.keyCode);
		if(e.keyCode !== 116 && this.hogAllInput) {
			e.preventDefault();
		}
	}
	keyup(e) {
		Socket.keyup(e.keyCode);
		if(e.keyCode !== 116 && this.hogAllInput) {
			e.preventDefault();
		}
	}
	
}


export default new Controllers();