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
		};
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
		this.state.timeleft = time;
		this.setState(this.state);
	}
	componentDidMount() {
		Socket.addOnHudUpdate(this.onHudUpdate.bind(this));
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
				<td style={{width: '20%'}}>{ player.score }</td>
				<td style={{width: '20%'}}>{ player.ready ? "X" : "" }</td>
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
		if(!this.state.hud.ready) {
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
		if(this.state.timeleft >= 0) {
			return(
				<div>{this.state.timeleft} seconds until arena</div>
			);
		} else {
			return (
				<div>
				</div>
			);		
		}
	}
	
	render() {
		return (
			<div id="hud">
				<div className="self">
					<div className="name" style={{ color: this.state.hud.color }} >{this.state.hud.name}</div>
					<progress value={ this.state.hud.health } max="100"/>
					<div className="scrap">Scrap: {this.state.hud.scrap}</div>
					<div>{ this.renderReadyButton() }</div>
					<div>{ this.renderCountdown() }</div>
				</div>
				<div>{ this.renderScoreBoard() }</div>
				<div className="controls">Controls:<br/>WASD - Steering<br/>Space - Brake<br/>Up - Fire<br/>Left/Right - Turret rotation<br/>E - Boost<br/>Q - Parachute<br/>Esc - Leave Shop<br/></div>
			</div>
		);
    }
}

export default HUD;