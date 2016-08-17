import React from 'react';
import request from 'superagent';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Button from 'react-bootstrap/lib/Button';

export default class CurrentJob extends React.Component {
  constructor(props) {
    super(props);

    this.sendCommand = this.sendCommand.bind(this);
    this.cancelJob = this.cancelJob.bind(this);
  }

  sendCommand(command) {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command })
    .set('Accept', 'application/json')
    .end();
  }

  cancelJob() {
    request.post(`/v1/jobs/${this.props.bot.currentJob.uuid}`)
    .send({ command: `cancel` })
    .set('Accept', 'application/json')
    .end();
  }

  renderConnectButton() {
    switch (this.props.bot.state) {
      case `unavailable`:
        return <Button onClick={() => { this.sendCommand('checkSubscription') } }>Detect</Button>;
      case `detecting`:
      case `ready`:
      case `startingJob`:
      case `stopping`:
      case `parking`:
      case `unparking`:
      case `connecting`:
        return <Button onClick={() => { this.sendCommand('connect') } }>Connect</Button>;
      default:
        return <Button onClick={() => { this.sendCommand('disconnect') } }>Disconnect</Button>;
    }
  }

  renderPauseButton() {
    if (this.props.bot.currentJob === undefined) {
      return <Button disabled>Pause/Resume</Button>;
    }

    switch (this.props.bot.currentJob.state) {
      case `paused`:
        return <Button onClick={ () => { this.sendCommand('resume') } }>Resume</Button>;
      case `running`:
        return <Button onClick={ () => { this.sendCommand('pause') } }>Pause</Button>;
      default:
        return <Button disabled>{this.props.bot.currentJob.state}</Button>;
    }
  }

  renderCancelButton() {
    if (this.props.bot.currentJob === undefined) {
      return <Button bsStyle="danger" disabled>Cancel</Button>;
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
        <h3>Current Job!</h3>
        <div className="row">
          <div className="col-sm-4">
            {this.renderConnectButton()}
          </div>
          <div className="col-sm-4">
            {this.renderPauseButton()}
          </div>
          <div className="col-sm-4">
            {this.renderCancelButton()}
          </div>
        </div>
        <br/>
        {this.renderProgressBar()}
      </div>
    );
  }
}
