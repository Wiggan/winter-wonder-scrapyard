import React from 'react';
import Socket from './socket'
import './hud.css'

var StateEnum = {
	lobby: 1,
	normal: 2,
	arena: 3,
	transition: 4
};
Object.freeze(StateEnum);

class HUD extends React.Component { 

	constructor() {
		super();
		this.state = {
			hud: {},
			game: {
				playerStates: [],
				state: StateEnum.lobby,
				physicsOn: true,
				msg: 0,
			},
			timeleft: -1,
			rocketProgress: 1,
			boostProgress: 1,
			parachuteProgress: 1,
		};
	}

	onCoolDown(msg) {
		console.log(msg);
		var cooldown = JSON.parse(msg);
		if(cooldown.item == "rocket") {
			this.rocketCooldown = cooldown.time;
			this.rocketCooldownElapsed = 0;
			this.rocketInterval = setInterval(() => {
				this.rocketCooldownElapsed += 16.666; 
				this.setState({
					rocketProgress: this.rocketCooldownElapsed / this.rocketCooldown
				});
				if(this.state.rocketProgress >= 1) clearInterval(this.rocketInterval);
			}, 16.666);
		} else if(cooldown.item == "boost") {
			this.boostCooldown = cooldown.time;
			this.boostCooldownElapsed = 0;
			this.boostInterval = setInterval(() => {
				this.boostCooldownElapsed += 16.666; 
				this.setState({
					boostProgress: this.boostCooldownElapsed / this.boostCooldown
				});
				if(this.state.boostProgress >= 1) clearInterval(this.boostInterval);
			}, 16.666);
		} else if(cooldown.item == "parachute") {
			this.parachuteCooldown = cooldown.time;
			this.parachuteCooldownElapsed = 0;
			this.parachuteInterval = setInterval(() => {
				this.parachuteCooldownElapsed += 16.666; 
				this.setState({
					parachuteProgress: this.parachuteCooldownElapsed / this.parachuteCooldown
				});
				if(this.state.parachuteProgress >= 1) clearInterval(this.parachuteInterval);
			}, 16.666);
		}	
	}
	onHudUpdate(hud) {
		this.state.hud = JSON.parse(hud);
		this.setState(this.state);
	} 
	onGameUpdate(game) {
		this.state.game = JSON.parse(game);
		this.setState(this.state);
	}
	onCountdownStarted(time) {
		console.log("Got coutdown: " + time + " in state: " + this.state.game.state);
		this.state.timeleft = time;
		this.setState(this.state);
	}
	componentDidMount() {
		Socket.addOnHudUpdate(this.onHudUpdate.bind(this));
		Socket.setOnCoolDown(this.onCoolDown.bind(this));
		Socket.addOnGameUpdate(this.onGameUpdate.bind(this));
		Socket.setOnCountdownStarted(this.onCountdownStarted.bind(this));
		this.countdownInterval = setInterval(() => {
			this.state.timeleft -= 1;
			this.setState(this.state);
		}, 1000);
		Socket.getHud();
	}
	
	renderPlayer(player) {
		return(
			<tr style={{ color: player.color }}>
				<td className="playername" style={{width: '80%'}}>{ player.name }</td>
				<td className="playername" style={{width: '20%'}}>{ player.score }</td>
				<td className="playername" style={{width: '20%'}}>{ player.ready ? "X" : "" }</td>
			</tr>
		);
	}
	
	renderScoreBoard() {
		return (
			<table className="scoreboard">
			<tr>
				<th>Name</th><th>Score</th><th>Ready</th>
			</tr>
			{this.state.game.playerStates.map((player) => { return this.renderPlayer(player) })}
			</table>
		);
	}
	
	onReadyClicked() {
		Socket.ready();
	}
	
	renderReadyButton() {
		if(!this.state.hud.ready && this.state.game.state === StateEnum.lobby) {
			return(
				<button onClick={this.onReadyClicked}>Ready</button>
			);
		} else {
			return (
				<div>
				</div>
			);		
		}
	}
	
	renderCountdown() {
		if(this.state.timeleft >= 0 && this.state.game.state === StateEnum.normal) {
			return(
				<div>{this.state.timeleft}s until arena</div>
			);
		} else {
			return (
				<div>
				</div>
			);		
		}
	}
	
	renderHealth() {
		return (
			<tr>
			<td className="property" width="50%">Health:</td>
			<td width="50%"><meter value={ this.state.hud.health } max="100" high="75" low="25" optimum="100"/></td>
			</tr>
		);
	}
	
	renderRocketCooldown() {
		if(this.state.hud.rockets === true) {
			return (
				<tr>
				<td className="property" width="50%">Rocket:</td>
				<td width="50%"><meter value={ this.state.rocketProgress } min="0" max="1"/></td>
				</tr>
			);
		} else {
			return (
				<tr></tr>
			);
		}
	}
	renderBoostCooldown() {
		if(this.state.hud.boost === true) {
			return (
				<tr>
				<td className="property" width="50%">Boost:</td>
				<td width="50%"><meter value={ this.state.boostProgress } min="0" max="1"/></td>
				</tr>
			);
		} else {
			return (
				<tr></tr>
			);
		}
	}
	renderParachuteCooldown() {
		if(this.state.hud.parachute === true) {
			return (
				<tr>
				<td className="property" width="50%">Parachute:</td>
				<td width="50%"><meter value={ this.state.parachuteProgress } min="0" max="1"/></td>
				</tr>
			);
		} else {
			return (
				<tr></tr>
			);
		}
	}
	
	renderCooldowns() {
		return (
			<table>
				{this.renderHealth()}
				{this.renderRocketCooldown()}
				{this.renderBoostCooldown()}
				{this.renderParachuteCooldown()}
			</table>
		);
	}
	
	renderState() {
		switch(this.state.game.state) {
			case StateEnum.lobby:
				return (
				<div>Lobby</div>
				);
				break;
			case StateEnum.normal:
				return (
				<div>Collect & Buy</div>
				);
				break;
			case StateEnum.arena:
				return (
				<div>Arena</div>
				);
				break;
		}
	}
	
	getControlStyle(hasEquipment) {
		if(hasEquipment === true) {
			return "white";
		} else {
			return "grey";
		}
	}
	
	renderControls() {
		return(
			<div>
				<div style={{color: this.getControlStyle(true)}}>Controls:</div>
				<div style={{color: this.getControlStyle(true)}}>WASD - Steering</div>
				<div style={{color: this.getControlStyle(true)}}>Space - Brake</div>
				<div style={{color: this.getControlStyle(this.state.hud.rockets)}}>Up - Fire</div>
				<div style={{color: this.getControlStyle(this.state.hud.towerRotation)}}>Left/Right - Turret rotation</div>
				<div style={{color: this.getControlStyle(this.state.hud.boost)}}>E - Boost</div>
				<div style={{color: this.getControlStyle(this.state.hud.parachute)}}>Q - Parachute</div>
				<div style={{color: this.getControlStyle(true)}}>Esc - Leave Shop</div>
			</div>
		);
	}
	
	render() {
		return (
			<div id="hud">
				<div className="self">
					<div className="state">{this.renderState()}</div>
					<div className="name" style={{ color: this.state.hud.color }} >{this.state.hud.name}</div>
					<div>{this.renderCooldowns()}</div>
					<div className="property">Scrap: {this.state.hud.scrap}</div>
					<div>{ this.renderReadyButton() }</div>
					<div>{ this.renderCountdown() }</div>
				</div>
				<div>{ this.renderScoreBoard() }</div>
				<div className="controls">{ this.renderControls() }</div>
			</div>
		);
    }
}

export default HUD;