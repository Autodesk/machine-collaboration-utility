import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import request from 'superagent';

import JogPanel from './JogPanel';

export default class Bot extends React.Component {
  constructor(props) {
    super(props);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  connect() {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command: `connect` })
    .set('Accept', 'application/json')
    .end();
  }

  disconnect() {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command: `disconnect` })
    .set('Accept', 'application/json')
    .end();
  }

  renderConnectButton() {
    switch (this.props.bot.state) {
      case `ready`:
        return <Button onClick={this.connect}>Connect!</Button>;
      case `connected`:
        return <Button onClick={this.disconnect}>Disconnect!</Button>;
      default:
        return <Button>Nope!</Button>;
    }
  }

  render() {
    return (
      <div>
        <h3>{this.props.bot.settings.name}</h3>
        {this.renderConnectButton()}
        <div>State: {this.props.bot.state}</div>
        <div>Port: {this.props.bot.port}</div>
        <JogPanel endpoint={`/v1/bots/${this.props.bot.settings.uuid}`}/>
      </div>
    );
  }
}
