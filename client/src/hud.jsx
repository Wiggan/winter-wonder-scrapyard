import React from 'react';
import Socket from './socket'
import Controllers from './controllers'
import './hud.css'

var StateEnum = {
	lobby: 1,
	normal: 2,
	arena: 3,
	transition: 4,
	shopping: 5
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
			scrapColor: "white",
			name: "",
		};
		
		
		this.handleChange = this.handleChange.bind(this);
		this.onTextFocusIn = this.onTextFocusIn.bind(this);
		this.onTextFocusOut = this.onTextFocusOut.bind(this);
		this.onReadyClicked = this.onReadyClicked.bind(this);
	}

	onCoolDown(msg) {
		console.log(msg);
		var cooldown = JSON.parse(msg);
		if(cooldown.item === "rocket") {
			this.rocketCooldown = cooldown.time;
			this.rocketCooldownElapsed = 0;
			this.rocketInterval = setInterval(() => {
				this.rocketCooldownElapsed += 16.666; 
				this.setState({
					rocketProgress: this.rocketCooldownElapsed / this.rocketCooldown
				});
				if(this.state.rocketProgress >= 1) clearInterval(this.rocketInterval);
			}, 16.666);
		} else if(cooldown.item === "boost") {
			this.boostCooldown = cooldown.time;
			this.boostCooldownElapsed = 0;
			this.boostInterval = setInterval(() => {
				this.boostCooldownElapsed += 16.666; 
				this.setState({
					boostProgress: this.boostCooldownElapsed / this.boostCooldown
				});
				if(this.state.boostProgress >= 1) clearInterval(this.boostInterval);
			}, 16.666);
		} else if(cooldown.item === "parachute") {
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
	
	setScrapColor(color) {
		var newState = this.state;
		newState.scrapColor = color; 
		this.setState(newState); 
	}
	
	onHudUpdate(hud) {
		var newHud = JSON.parse(hud);
		if(this.state.hud.scrap < newHud.scrap) {
			this.setScrapColor("green");
			setTimeout(() => { this.setScrapColor("white"); }, 100);
			setTimeout(() => { this.setScrapColor("green"); }, 200);
			setTimeout(() => { this.setScrapColor("white"); }, 300);
			setTimeout(() => { this.setScrapColor("green"); }, 400);
			setTimeout(() => { this.setScrapColor("white"); }, 500);
			setTimeout(() => { this.setScrapColor("green"); }, 600);
			setTimeout(() => { this.setScrapColor("white"); }, 700);
		}
		var newState = this.state;
		newState.hud = newHud;
		if(!this.hasGottenName) {
			newState.name = newHud.name;
			this.hasGottenName = true;
		}
		this.setState(newState);
	} 
	onGameUpdate(game) {
		var newState = this.state;
		newState.game = JSON.parse(game);
		this.setState(newState);
	}
	onCountdownStarted(time) {
		console.log("Got coutdown: " + time + " in state: " + this.state.game.state);
		var newState = this.state;
		newState.timeleft = time;
		this.setState(newState);
	}
	componentDidMount() {
		Socket.addOnHudUpdate(this.onHudUpdate.bind(this));
		Socket.setOnCoolDown(this.onCoolDown.bind(this));
		Socket.addOnGameUpdate(this.onGameUpdate.bind(this));
		Socket.setOnCountdownStarted(this.onCountdownStarted.bind(this));
		this.countdownInterval = setInterval(() => {
			var newState = this.state;
			newState.timeleft -= 1;
			this.setState(newState);
		}, 1000);
		Socket.getHud();
	}
	
	renderPlayer(player) {
		return(
			<tr key={player.name} style={{ color: player.color }}>
				<td className="playername" style={{width: '80%'}}>{ player.name }</td>
				<td className="playername" style={{width: '20%'}}>{ player.score }</td>
				<td className="playername" style={{width: '20%'}}>{ player.ready ? "X" : "" }</td>
			</tr>
		);
	}
	
	renderScoreBoard() {
		return (
			<table className="scoreboard"><tbody>
			<tr>
				<th>Name</th><th>Score</th><th>Ready</th>
			</tr>
			{this.state.game.playerStates.map((player) => { return this.renderPlayer(player) })}
			</tbody></table>
		);
	}
	
	handleChange(event) {
		this.setState({name: event.target.value});
	}
	onReadyClicked(event) {
		if(this.state.name.length) {
			Socket.ready(this.state.name);
		} else {
			Socket.ready(this.state.hud.name);
		}
		event.preventDefault();
	}
	onTextFocusIn(event) {
		Controllers.hogAllInput = false;
	}
	onTextFocusOut(event) {
		Controllers.hogAllInput = true;
	}
	
	renderReadyButton() {
		if(!this.state.hud.ready && this.state.game.state === StateEnum.lobby) {
			return(
				<form onSubmit={this.onReadyClicked}>
					<label>
						Name:
						<input type="text" value={this.state.name} onChange={this.handleChange} onFocus={this.onTextFocusIn} onBlur={this.onTextFocusOut} />
					</label>
					<input type="submit" value="Ready" />
				</form>
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
			<table><tbody>
				{this.renderHealth()}
				{this.renderRocketCooldown()}
				{this.renderBoostCooldown()}
				{this.renderParachuteCooldown()}
			</tbody></table>
		);
	}
	
	renderState() {
		switch(this.state.game.state) {
			default:
			case StateEnum.lobby:
				return (
				<div>Lobby</div>
				);
			case StateEnum.normal:
				return (
				<div>Collect & Buy</div>
				);
			case StateEnum.shopping:
				return (
				<div>Prepare for arena!</div>
				);
			case StateEnum.arena:
				return (
				<div>Arena</div>
				);
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
				<div style={{color: this.getControlStyle(true)}}>Controls (Keyboard/Gamepad):</div>
				<div style={{color: this.getControlStyle(true)}}>A&D/Left Wheel - Steering</div>
				<div style={{color: this.getControlStyle(true)}}>W/RT - Forwards</div>
				<div style={{color: this.getControlStyle(true)}}>S/LT - Backwards</div>
				<div style={{color: this.getControlStyle(true)}}>Space/B - Brake</div>
				<div style={{color: this.getControlStyle(this.state.hud.rockets)}}>Up/X - Fire</div>
				<div style={{color: this.getControlStyle(this.state.hud.towerRotation)}}>Left&Right/Right Wheel - Turret rotation</div>
				<div style={{color: this.getControlStyle(this.state.hud.boost)}}>E/A - Boost</div>
				<div style={{color: this.getControlStyle(this.state.hud.parachute)}}>Q/LB - Parachute</div>
				<div style={{color: this.getControlStyle(true)}}>Esc/Back - Leave Shop</div>
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
					<div className="property" style={{ color: this.state.scrapColor }}>Scrap: {this.state.hud.scrap}</div>
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