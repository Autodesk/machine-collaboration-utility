import React from 'react';
import request from 'superagent';
import _ from 'underscore';

export default class ConductorPlayers extends React.Component {
  constructor(props) {
    super(props);
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

  createPlayerList() {
    const playerList = [];
    for (const player of this.props.bot.settings.custom.players) {
      playerList.push(this.createPlayer(player));
    }
    return playerList;
  }

  render() {
    const playerList = this.createPlayerList();
    return (
      <div>
        {playerList}
      </div>
    );
  }
}
