import React from 'react';
import request from 'superagent';
import _ from 'lodash';

export default class ConductorPlayers extends React.Component {
  constructor(props) {
    super(props);

    this.addPlayer = this.addPlayer.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
  }

  createPlayerList() {
    const playerList = [];
    const players = this.props.bot.settings.custom.players;
    for (const player of players) {
      playerList.push(this.createPlayer(player));
    }
    return playerList;
  }

  createPlayer(player) {
    return (
      <div className="row conductor-player" key={player.name}>
        <div className="col-md-4">Name: {player.name}</div>
        <div className="col-md-4">Endpoint: {player.endpoint}</div>
        <div className="col-md-4">
          <button
            className="cancel"
            onClick={() => {
              this.removePlayer(player.name);
            }}
          >
            X
          </button>
        </div>
      </div>
    );
  }

  addPlayer(event) {
    event.preventDefault();
    request
      .post(this.props.endpoint)
      .send({ command: 'addPlayer' })
      .send({ name: event.target.name.value })
      .send({ endpoint: event.target.endpoint.value })
      .set('Accept', 'application/json')
      .end();
  }

  removePlayer(name) {
    request
      .post(this.props.endpoint)
      .send({ command: 'removePlayer' })
      .send({ name })
      .set('Accept', 'application/json')
      .end();
  }

  createNewPlayerForm() {
    return (
      <form className="form" onSubmit={this.addPlayer}>
        <div className="row">
          <div className="col-md-4">
            <label htmlFor="name">Player Name:</label>
            <input className="conductor-form-text" type="textarea" name="name" defaultValue="" />
          </div>
          <div className="col-md-4">
            <label htmlFor="endpoint">Player Endpoint:</label>
            <input
              className="conductor-form-text"
              type="textarea"
              name="endpoint"
              defaultValue=""
            />
          </div>
          <div className="col-md-4">
            <input className="green-plz" type="submit" value="Add Player" />
          </div>
        </div>
      </form>
    );
  }

  render() {
    const playerList = this.createPlayerList();
    const newPlayerForm = this.createNewPlayerForm();

    return (
      <div>
        {playerList}
        {newPlayerForm}
      </div>
    );
  }
}
