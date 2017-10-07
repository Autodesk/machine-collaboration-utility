import React from 'react';
import uuidv4 from 'uuid/v4';

import Reply from './Reply';

export default class Terminal extends React.Component {
  constructor(props) {
    super(props);

    this.maxReplies = 32;
    this.updateInterval = 150;

    this.state = {
      listening: false,
      commands: [],
    };

    this.boundReceivedListener = null;
    this.boundSentListener = null;
  }

  listCommand({ sent }, command) {
    const commandObject = { sent, command, time: Date.now(), id: uuidv4() };
    const newCommands = Object.assign([], this.state.commands);
    if (newCommands.length > this.maxReplies) {
      newCommands.pop();
    }
    newCommands.unshift(commandObject);
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

  render() {
    return (
      <div className="terminal__scroll-wrapper">
        <div className="terminal__window">
          <div>
            <input type="text" />
            <button>Send Gcode</button>
          </div>
          {this.state.commands.map(reply => <Reply key={reply.id} reply={reply} />)}
        </div>
      </div>
    );
  }
}
