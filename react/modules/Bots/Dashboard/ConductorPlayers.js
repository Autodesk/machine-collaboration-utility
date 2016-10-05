import React from 'react';
import request from 'superagent';
import _ from 'underscore';

export default class ConductorPlayers extends React.Component {
  constructor(props) {
    super(props);
  }

  createPlayerList() {
    const playerList = [];
    for (const player of this.props.bot.settings.custom.players) {
      playerList.push(this.createPlayer(player));
    }
    return playerList;
  }

  createPlayer(player) {
    return (
      <div>
        <div>Name: {player.name}</div>
        <div>Endpoint: {player.endpoint}</div>
        <button>X</button>
      </div>
    );
  }

  addPlayer(event) {
    event.preventDefault();
  }

  createNewPlayerForm() {
    return (
      <form onSubmit={this.addPlayer}>
        <div>
          <label htmlFor="name">Player Name:</label>
          <input type="textarea" name="name" defaultValue="" />
        </div>
        <div>
          <label htmlFor="endpoint">Player Endpoint:</label>
          <input type="textarea" name="endpoint" defaultValue="" />
        </div>
        <input type="submit" value="Add Player" />
      </form>
    );
  }

  render() {
    const playerList = this.createPlayerList();
    const newPlayerForm = this.createNewPlayerForm();

    return (
      <div>
        {newPlayerForm}
        {playerList}
      </div>
    );
  }
}
