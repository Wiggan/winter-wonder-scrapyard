import React from 'react';
import './shop.css'
import Graph from 'react-graph-vis';
import Socket from './socket'
var options = require('./visoptions.json')

class Shop extends React.Component { 

	constructor() {
		super();
		this.state = {
			visible: false,
			nodes: [],
			edges: [] 
		}; 
	}

	render() {
		if (this.state.visible) {
			var graph = {
				nodes: this.state.nodes, 
				edges: this.state.edges
			};
			return (
				<div id="shop" className="canvas">
					<Graph id="shopgraph" graph={graph} options={options} events={{}} ref={node => this.network = node} />
				</div>
			);
		} else {
			return (
				<div>
				</div>
			);
		}
    }

	onNodeClicked(values, id, selected, hovering) {
		this.network.Network.unselectAll();
		if(selected) {
			Socket.buy(id);
		}
	}
	
	onShop(msg) {
		var data = JSON.parse(msg);
		console.log(data);
		var nodes = data.nodes;
		nodes.map((item) => {
			item.color = {background: options.nodes.color.background};
			switch(Math.floor(item.id / 100)) {
				case 0:
					if(item.chosen !== false) {
						item.color = {background: "#1c3462"};
						item.chosen = {node: this.onNodeClicked.bind(this)};
					} else if (item.owned) {
						item.color = {background: "#5c74a2"};
					}
				break;
				case 1:
					if(item.chosen !== false) {
						item.color = {background: "#5d722c"};
						item.chosen = {node: this.onNodeClicked.bind(this)};
					} else if (item.owned) {
						item.color = {background: "#8da25c"};
					}
				break;
				case 2:
				default:
					if(item.chosen !== false) {
						item.color = {background: "#722c2c"};
						item.chosen = {node: this.onNodeClicked.bind(this)};
					} else if (item.owned) {
						item.color = {background: "#a25c5c"};
					}
				break;
			}
			return item.label = "<b>" + item.label + "</b>\ncost: " + item.cost;
		});
		this.setState({
			nodes: nodes,
			edges: data.edges
		});
		
	}
	
	componentDidMount() {
		Socket.setOnShop(this.onShop.bind(this));
		Socket.getShop();
	}
	
	componentDidUpdate() {
		if (this.state.visible) {
			this.network.Network.fit();  // Fy fan.
		}
		// console.log(this.network);
	}
	
	setVisible(visible) {
		this.setState({
			visible: visible
		});
	}
	
}

export default Shop;