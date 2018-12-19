import React from 'react';
import Shop from './shop'
import HUD from './hud'
import Game from './game'
import './App.css'

class App extends React.Component { 

	render() {
		return (
			<div>
				<header className="App-header">
				<button onClick={() => {
					this.shop.setVisible(!this.shop.state.visible);
				}}>Shop</button>
				<div id="mainframe">
					<Game ref={node => this.game = node}/>
					<Shop ref={node => this.shop = node}/>
				</div>
				<HUD />
				</header>
			</div>
		);
    }

}

export default App;