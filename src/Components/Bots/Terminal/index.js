import React from 'react';
import FlipMove from 'react-flip-move';
import moment from 'moment';
import uuidv4 from 'uuid/v4';

import Reply from './Reply';

class Queue {
  constructor({ updateInterval = 100, action = () => {} }) {
    this.queue = [];
    this.action = action;
    this.updateInterval = updateInterval;
    this.updater = null;
  }

  push(item) {
    this.queue.unshift(item);
    if (!this.updater) {
      this.updater = setInterval(() => {
        const item = this.queue.pop();
        this.action(item);
        if (this.queue.length === 0) {
          clearInterval(this.updater);
          this.updater = null;
        }
      }, this.updateInterval);
    }
  }
}

export default class Terminal extends React.Component {
  constructor(props) {
    super(props);

    this.maxReplies = 32;
    this.updateInterval = 150;

    this.state = {
      listening: false,
      commands: [],
    };

    this.commandQueue = new Queue({
      updateInterval: this.updateInterval,
      action: (command) => {
        const newCommands = Object.assign([], this.state.commands);
        if (newCommands.length > this.maxReplies) {
          newCommands.pop();
        }
        newCommands.unshift(command);
        this.setState({ commands: newCommands });
      },
    });

    this.boundReceivedListener = null;
    this.boundSentListener = null;
  }

  listCommand({ sent }, command) {
    const commandObject = { sent, command, time: Date.now(), id: uuidv4() };
    this.commandQueue.push(commandObject);
  }

  socketConstructor() {
    this.boundReceivedListener = this.listCommand.bind(this, { sent: false });
    this.props.client.on('botReply', this.boundReceivedListener);
    this.boundSentListener = this.listCommand.bind(this, { sent: true });
    this.props.client.on('botSent', this.boundSentListener);
    this.setState({ listening: true });
  }

  socketDeconstructor() {
    this.props.client.removeListener('botReply', this.boundReceivedListener);
    this.props.client.removeListener('botSent', this.boundSentListener);
    this.boundReceivedListener = null;
    this.boundSentListener = null;
    this.setState({ listening: false });
  }

  componentWillReceiveProps(props) {
    if (props.open && !this.state.listening) {
      this.socketConstructor();
    } else if (!props.open && this.state.listening) {
      this.socketDeconstructor();
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
          <FlipMove duration={this.updateInterval * 0.9} maintainContainerHeight>
            {this.state.commands.map(reply => <Reply key={reply.id} reply={reply} />)}
          </FlipMove>
        </div>
      </div>
    );
  }
}
