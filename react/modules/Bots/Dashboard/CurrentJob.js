import React from 'react';
import request from 'superagent';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Button from 'react-bootstrap/lib/Button';

import { metaStates as botMetaStates } from '../botFsmDefinitions';

export default class CurrentJob extends React.Component {
  constructor(props) {
    super(props);

    this.sendCommand = this.sendCommand.bind(this);
    this.cancelJob = this.cancelJob.bind(this);
  }

  sendCommand(command) {
    request.post(this.props.endpoint)
    .send({ command })
    .set('Accept', 'application/json')
    .end();
  }

  cancelJob() {
    request.post(this.props.endpoint)
    .send({ command: 'cancel' })
    .set('Accept', 'application/json')
    .end();
  }

  renderConnectButton() {
    if (this.props.bot.state === 'uninitialized') {
      return <Button onClick={() => { this.sendCommand('discover'); }}>Detect</Button>;
    }

    if (this.props.bot.state === 'uninitialized' || this.props.bot.state === 'ready') {
      return <Button className="connect" onClick={() => { this.sendCommand('connect') } }>Connect</Button>;
    }
    if (botMetaStates.connected.includes(this.props.bot.state)) {
      return <Button className="disconnect" onClick={() => { this.sendCommand('disconnect'); }}>Disconnect</Button>;
    }

    return <Button disabled>{this.props.bot.state}</Button>;
  }

  renderPauseButton() {
    if (this.props.bot.currentJob === undefined) {
      return <Button className="pause-resume" disabled>Pause/Resume</Button>;
    }

    switch (this.props.bot.state) {
      case 'paused':
        return <Button onClick={() => { this.sendCommand('resume'); }}>Resume</Button>;
      case 'executingJob':
        return <Button onClick={() => { this.sendCommand('pause'); }}>Pause</Button>;
      default:
        return <Button className="pause-resume" disabled>Pause/Resume</Button>;
    }
  }

  renderCancelButton() {
    if (this.props.bot.currentJob === undefined) {
      return <Button className="cancel" bsStyle="danger" disabled>Cancel</Button>;
    }
    return <Button bsStyle="danger" onClick={this.cancelJob}>Cancel</Button>;
  }

  renderProgressBar() {
    if (this.props.bot.currentJob === undefined) {
      return <ProgressBar now={0}/>;
    }
    const percentComplete = this.props.bot.currentJob.percentComplete;
    return <ProgressBar active now={percentComplete} label={`${percentComplete}%`} />;
  }

  render() {
    return (
      <div>
        <div className="area max-area-width">
          <h3>CURRENT STATE: {this.props.bot.state.toUpperCase()}</h3>
          <div className="row">
            <div className="col-xs-3">
              {this.renderConnectButton()}
            </div>
            <div className="col-xs-5">
              {this.renderPauseButton()}
            </div>
            <div className="col-xs-4">
              {this.renderCancelButton()}
            </div>
          </div>
        </div>
        <br/>
        {this.renderProgressBar()}
      </div>
    );
  }
}
