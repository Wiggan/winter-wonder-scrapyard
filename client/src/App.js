import React from 'react';
import HUD from './hud'
import Game from './game'
import './App.css'

class App extends React.Component { 

	render() {
		return (
			<div>
				<header className="App-header">
				<div id="mainframe">
					<Game ref={node => this.game = node}/>
				</div>
				<HUD />
				</header>
			</div>
		);
    }

}

export default App;