import React from 'react';
import autobind from 'react-autobind';
import SimpleSchema from 'simpl-schema';

import HoverAndClick from './HoverAndClick';

export default class ConductorPlayers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      playerName: '',
      playerEndpoint: '',
    };

    autobind(this);
  }

  updatePlayerName(event) {
    this.setState({ playerName: event.target.value });
  }

  updatePlayerEndpoint(event) {
    this.setState({ playerEndpoint: event.target.value });
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
          <HoverAndClick color={{ h: 0, s: 40, l: 40 }}>
            <button
              className="cancel"
              onClick={() => {
                this.removePlayer(player.name);
              }}
            >
              X
            </button>
          </HoverAndClick>
        </div>
      </div>
    );
  }

  addPlayer() {
    if (this.validInput()) {
      try {
        const commandObject = {
          botUuid: this.props.endpoint,
          command: 'addPlayer',
          name: this.state.playerName,
          endpoint: this.state.playerEndpoint,
        };

        this.props.client.emit('command', commandObject);
      } catch (ex) {
        console.log('error', ex);
      }
    }
  }

  removePlayer(name) {
    try {
      const commandObject = {
        botUuid: this.props.endpoint,
        command: 'removePlayer',
        name,
      };

      this.props.client.emit('command', commandObject);
    } catch (ex) {
      console.log('error', ex);
    }
  }

  validInput() {
    try {
      const schema = new SimpleSchema({
        name: {
          type: String,
          min: 1,
          label: 'Player name',
        },
        endpoint: {
          type: String,
          regEx: SimpleSchema.RegEx.Url,
          label: 'Player endpoint',
        },
      });

      // If validation does not throw an error, return true
      schema.validate({
        name: this.state.playerName,
        endpoint: this.state.playerEndpoint,
      });

      return true;
    } catch (ex) {
      return false;
    }
  }

  createNewPlayerForm() {
    return (
      <form className="form">
        <div className="row">
          <div className="col-md-4">
            <label htmlFor="name">Player Name:</label>
            <input
              onChange={this.updatePlayerName}
              className="conductor-form-text"
              type="textarea"
              name="name"
              value={this.state.playerName}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="endpoint">Player Endpoint:</label>
            <input
              onChange={this.updatePlayerEndpoint}
              className="conductor-form-text"
              type="textarea"
              name="endpoint"
              value={this.state.playerEndpoint}
            />
          </div>
          <div className="col-md-4">
            <div style={{ paddingTop: '30px' }}>
              <HoverAndClick color={{ h: 120, s: this.validInput() ? 40 : 5, l: 40 }}>
                <button disabled={!this.validInput()} onClick={this.addPlayer}>
                  Add Player
                </button>
              </HoverAndClick>
            </div>
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
