import React, { Component } from 'react'

import io from 'socket.io-client'

import TweenMax from 'gsap'

import rand_arr_elem from '../../helpers/rand_arr_elem'
import rand_to_fro from '../../helpers/rand_to_fro'

const GRID_SIZE = 5;
const GRID_ARRAY = Array(GRID_SIZE).fill(0)

const horizontalWinsRows = GRID_ARRAY.map(function (_, rowIndex) {
	const row = GRID_ARRAY.map(function (_, colIndex) {
		const id = rowIndex * GRID_SIZE + colIndex + 1
		return `c${id}`
	})
	return row
})

const verticalWinsCols = GRID_ARRAY.map(function (_, colIndex) {
	const col = GRID_ARRAY.map(function (_, rowIndex) {
		const id = rowIndex * GRID_SIZE + colIndex + 1
		return `c${id}`
	})
	return col
})

// Diagonal wins (top-left)
const DiagonalWinsTL = GRID_ARRAY.map(function (_, index) {
	const id = 1 + index * (GRID_SIZE + 1)
	return `c${id}`
})

// Diagonal wins (bottom-right)
const DiagonalWinsBR = GRID_ARRAY.map(function (_, index) {
	const id = 5 + index * (GRID_SIZE - 1)
	return `c${id}`
})

const win_sets = [
	...horizontalWinsRows,
	...verticalWinsCols,
	DiagonalWinsTL,
	DiagonalWinsBR,
]

export default class SetName extends Component {

	constructor(props) {
		super(props)

		if (this.props.game_type != 'live')
			this.state = {
				cell_vals: {},
				next_turn_ply: true,
				game_play: true,
				game_stat: 'Start game'
			}
		else {
			this.sock_start()

			this.state = {
				cell_vals: {},
				next_turn_ply: true,
				game_play: false,
				game_stat: 'Connecting'
			}
		}
	}

	//	------------------------	------------------------	------------------------

	componentDidMount() {
		TweenMax.from('#game_stat', 1, { display: 'none', opacity: 0, scaleX: 0, scaleY: 0, ease: Power4.easeIn })
		TweenMax.from('#game_board', 1, { display: 'none', opacity: 0, x: -200, y: -200, scaleX: 0, scaleY: 0, ease: Power4.easeIn })
	}

	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	sock_start() {

		this.socket = io(app.settings.ws_conf.loc.SOCKET__io.u);

		this.socket.on('connect', function (data) {
			// console.log('socket connected', data)

			this.socket.emit('new player', { name: app.settings.curr_user.name });

		}.bind(this));

		this.socket.on('pair_players', function (data) {
			// console.log('paired with ', data)

			this.setState({
				next_turn_ply: data.mode == 'm',
				game_play: true,
				game_stat: 'Playing with ' + data.opp.name
			})

		}.bind(this));


		this.socket.on('opp_turn', this.turn_opp_live.bind(this));



	}

	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	componentWillUnmount() {

		this.socket && this.socket.disconnect();
	}

	//	------------------------	------------------------	------------------------

	cell_cont(c) {
		const { cell_vals } = this.state
		return (
			<div>
				{cell_vals && cell_vals[c] == 'x' && <i className="fa fa-times fa-5x"></i>}
				{cell_vals && cell_vals[c] == 'o' && <i className="fa fa-circle-o fa-5x"></i>}
			</div>
		)
	}

	//	------------------------	------------------------	------------------------

	render() {
		// const { cell_vals } = this.state
		// console.log(cell_vals)

		return (
			<div id='GameMain'>

				<h1>Play {this.props.game_type}</h1>

				<div id="game_stat">
					<div id="game_stat_msg">{this.state.game_stat}</div>
					{this.state.game_play && <div id="game_turn_msg">{this.state.next_turn_ply ? 'Your turn' : 'Opponent turn'}</div>}
				</div>

				<div id="game_board">
					<table>
						<tbody>
							{
								GRID_ARRAY.map(function (_, rowIndex) {
									return (
										<tr key={rowIndex}>
											{
												GRID_ARRAY.map(function (_, colIndex) {
													const cellId = `c${rowIndex * GRID_SIZE + colIndex + 1}`
													const vbrdClassName = colIndex > 0 && colIndex < GRID_SIZE - 1 ? 'vbrd' : ''
													const hbrdClassName = rowIndex > 0 && rowIndex < GRID_SIZE - 1 ? 'hbrd' : ''
													return (
														<td
															key={cellId}
															ref={cellId}
															id={`game_board-${cellId}`}
															className={`${vbrdClassName} ${hbrdClassName}`}
															onClick={this.click_cell.bind(this)}
														>
															{this.cell_cont(cellId)}
														</td>
													)
												}.bind(this))
											}
										</tr>
									)
								}.bind(this))
							}
						</tbody>
					</table>
				</div>

				<button type='submit' onClick={this.end_game.bind(this)} className='button'><span>End Game <span className='fa fa-caret-right'></span></span></button>

			</div>
		)
	}

	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	click_cell(e) {
		// console.log(e.currentTarget.id.substr(11))
		// console.log(e.currentTarget)

		if (!this.state.next_turn_ply || !this.state.game_play) return

		const cell_id = e.currentTarget.id.substr(11)
		if (this.state.cell_vals[cell_id]) return

		if (this.props.game_type != 'live')
			this.turn_ply_comp(cell_id)
		else
			this.turn_ply_live(cell_id)
	}

	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	turn_ply_comp(cell_id) {

		let { cell_vals } = this.state

		cell_vals[cell_id] = 'x'

		TweenMax.from(this.refs[cell_id], 0.7, { opacity: 0, scaleX: 0, scaleY: 0, ease: Power4.easeOut })

		// this.setState({
		// 	cell_vals: cell_vals,
		// 	next_turn_ply: false
		// })

		// setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

		this.state.cell_vals = cell_vals

		this.check_turn()
	}

	//	------------------------	------------------------	------------------------

	turn_comp() {

		let { cell_vals } = this.state
		let empty_cells_arr = []


		for (let i = 1; i <= GRID_SIZE * GRID_SIZE; i++)
			!cell_vals['c' + i] && empty_cells_arr.push('c' + i)
		// console.log(cell_vals, empty_cells_arr, rand_arr_elem(empty_cells_arr))

		const c = rand_arr_elem(empty_cells_arr)
		cell_vals[c] = 'o'

		TweenMax.from(this.refs[c], 0.7, { opacity: 0, scaleX: 0, scaleY: 0, ease: Power4.easeOut })


		// this.setState({
		// 	cell_vals: cell_vals,
		// 	next_turn_ply: true
		// })

		this.state.cell_vals = cell_vals

		this.check_turn()
	}


	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	turn_ply_live(cell_id) {

		let { cell_vals } = this.state

		cell_vals[cell_id] = 'x'

		TweenMax.from(this.refs[cell_id], 0.7, { opacity: 0, scaleX: 0, scaleY: 0, ease: Power4.easeOut })

		this.socket.emit('ply_turn', { cell_id: cell_id });

		// this.setState({
		// 	cell_vals: cell_vals,
		// 	next_turn_ply: false
		// })

		// setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

		this.state.cell_vals = cell_vals

		this.check_turn()
	}

	//	------------------------	------------------------	------------------------

	turn_opp_live(data) {

		let { cell_vals } = this.state
		let empty_cells_arr = []


		const c = data.cell_id
		cell_vals[c] = 'o'

		TweenMax.from(this.refs[c], 0.7, { opacity: 0, scaleX: 0, scaleY: 0, ease: Power4.easeOut })


		// this.setState({
		// 	cell_vals: cell_vals,
		// 	next_turn_ply: true
		// })

		this.state.cell_vals = cell_vals

		this.check_turn()
	}

	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------
	//	------------------------	------------------------	------------------------

	check_turn() {

		const { cell_vals } = this.state

		let win = false
		let set
		let fin = true

		if (this.props.game_type != 'live')
			this.state.game_stat = 'Play'


		for (let i = 0; !win && i < win_sets.length; i++) {
			set = win_sets[i]
			// if (cell_vals[set[0]] && cell_vals[set[0]] == cell_vals[set[1]] && cell_vals[set[0]] == cell_vals[set[2]])
			// 	win = true
			const hasWin = Array(GRID_SIZE).fill(0).every(function (_, index) {
				return cell_vals[set[0]] && cell_vals[set[0]] === cell_vals[set[index]]
			})
			if (hasWin) {
				win = true
				break;
			}
		}

		for (let i = 1; i <= GRID_SIZE * GRID_SIZE; i++)
			!cell_vals['c' + i] && (fin = false)

		// win && console.log('win set: ', set)

		if (win) {
			set.forEach(function (index) {
				this.refs[index].classList.add('win')
			}.bind(this))

			TweenMax.killAll(true)
			TweenMax.from('td.win', 1, { opacity: 0, ease: Linear.easeIn })

			this.setState({
				game_stat: (set[0] == 'x' ? 'You' : 'Opponent') + ' win',
				game_play: false
			})

			this.socket && this.socket.disconnect();

		} else if (fin) {

			this.setState({
				game_stat: 'Draw',
				game_play: false
			})

			this.socket && this.socket.disconnect();

		} else {
			this.props.game_type != 'live' && this.state.next_turn_ply && setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

			this.setState({
				next_turn_ply: !this.state.next_turn_ply
			})
		}

	}

	//	------------------------	------------------------	------------------------

	end_game() {
		this.socket && this.socket.disconnect();

		this.props.onEndGame()
	}



}
