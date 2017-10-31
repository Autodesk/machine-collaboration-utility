import React from 'react';
import uuidv4 from 'uuid/v4';
import autobind from 'react-autobind';

import HoverAndClick from '../Dashboard/HoverAndClick';
import Reply from './Reply';
import { metaStates as botMetaStates } from '../botFsmDefinitions';

export default class Terminal extends React.Component {
  constructor(props) {
    super(props);

    this.maxReplies = 32;
    this.updateInterval = 150;

    this.state = {
      listening: false,
      commands: [],
      gcodeInput: '',
    };

    this.boundReceivedListener = null;
    this.boundSentListener = null;

    autobind(this);
  }

  listCommand({ sent }, command) {
    const commandObject = { sent, command, time: Date.now(), id: uuidv4() };
    const newCommands = Object.assign([], this.state.commands);
    if (newCommands.length > this.maxReplies) {
      newCommands.shift();
    }
    newCommands.push(commandObject);
    this.setState({ commands: newCommands });
  }

  socketConstructor(botUuid) {
    this.boundReceivedListener = this.listCommand.bind(this, { sent: false });
    this.props.client.on(`botRx${botUuid}`, this.boundReceivedListener);
    this.boundSentListener = this.listCommand.bind(this, { sent: true });
    this.props.client.on(`botTx${botUuid}`, this.boundSentListener);
    this.setState({ listening: true });
  }

  socketDeconstructor(botUuid) {
    this.props.client.removeListener(`botRx${botUuid}`, this.boundReceivedListener);
    this.props.client.removeListener(`botTx${botUuid}`, this.boundSentListener);
    this.boundReceivedListener = null;
    this.boundSentListener = null;
    this.setState({ listening: false });
  }

  componentWillReceiveProps(props) {
    // In case terminal is open and a different bot is selected
    // Close the current event listeners and create new listeners
    if (this.props.endpoint !== props.endpoint && this.state.listening) {
      this.socketDeconstructor(this.props.bot.settings.uuid);
      this.socketConstructor(props.bot.settings.uuid);
      this.setState({ commands: [] });
    }

    if (props.open && !this.state.listening) {
      this.socketConstructor(this.props.bot.settings.uuid);
    } else if (!props.open && this.state.listening) {
      this.socketDeconstructor(this.props.bot.settings.uuid);
    }
  }

  updateGcodeInput(e) {
    this.setState({ gcodeInput: e.target.value.toUpperCase() });
  }

  submitGcode(e) {
    e.preventDefault();

    const gcode = this.state.gcodeInput;

    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'processGcode',
      gcode,
    };

    if (this.props.forceJog === true) {
      commandObject.force = true;
    }

    // request gcode input to be processed by bot
    this.props.client.emit('command', commandObject);

    // set gcodeinput to blank string
    this.setState({ gcodeInput: '' });
  }

  render() {
    const commandable =
      this.state.gcodeInput.length > 0 &&
      (this.props.bot.state === 'idle' ||
        this.props.bot.state === 'paused' ||
        (this.props.forceJog === true && botMetaStates.connected.includes(this.props.bot.state)));

    return (
      <div className="terminal__scroll-wrapper container-fluid">
        <div className="terminal--buttons row">
          <div className="col-xs-8 col-sm-8 col-md-8 col-lg-8">
            <form onSubmit={this.submitGcode}>
              <input
                name="gcode"
                className="text-input"
                value={this.state.gcodeInput}
                default=""
                placeholder="Enter Gcode Here"
                onChange={this.updateGcodeInput}
                type="text"
              />
            </form>
          </div>
          <div className="col-xs-2 col-sm-2 col-md-2 col-lg-2">
            <HoverAndClick color={{ h: 120, s: commandable ? 40 : 5, l: 40 }}>
              <button
                className="terminal--button"
                disabled={!commandable}
                onClick={this.submitGcode}
              >
                Send Gcode
              </button>
            </HoverAndClick>
          </div>
          <div className="col-xs-2 col-sm-2 col-md-2 col-lg-2">
            <HoverAndClick color={{ h: this.props.forceJog ? 120 : 0, s: 40, l: 40 }}>
              <button
                className="terminal--button"
                onClick={() => {
                  this.props.toggleForceJog();
                }}
              >
                {this.props.forceJog ? 'Disable Live Jog' : 'Enable Live Jog'}
              </button>
            </HoverAndClick>
          </div>
        </div>
        <div className="terminal__window">
          {this.state.commands.map(reply => <Reply key={reply.id} reply={reply} />)}
        </div>
      </div>
    );
  }
}
