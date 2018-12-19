import React from 'react';
import Socket from './socket'
import './hud.css'

class HUD extends React.Component { 

	constructor() {
		super();
		this.state = {
			hud: {},
			score: []
		};
	}

	onHudUpdate(hud) {
		this.state.hud = JSON.parse(hud);
		this.setState(this.state);
	} 
	onScoreUpdate(score) {
		this.state.score = JSON.parse(score);
		console.log(this.state.score);
		this.setState(this.state);
	}
	componentDidMount() {
		Socket.setOnHudUpdate(this.onHudUpdate.bind(this));
		Socket.setOnScoreUpdate(this.onScoreUpdate.bind(this));
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
			{this.state.score.map((player) => { return this.renderPlayer(player) })}
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
	
	render() {
		return (
			<div id="hud">
				<div className="self">
					<div className="name" style={{ color: this.state.hud.color }} >{this.state.hud.name}</div>
					<div className="scrap">Scrap: {this.state.hud.scrap}</div>
					<div>{ this.renderReadyButton() }</div>
				</div>
				<div>{ this.renderScoreBoard() }</div>
				<div className="controls">Controls:<br/>WASD - Steering<br/>Space - Brake<br/>Up/Down - Fire<br/>Left/Right - Turret rotation<br/>Ctrl - Boost<br/></div>
			</div>
		);
    }
}

export default HUD;