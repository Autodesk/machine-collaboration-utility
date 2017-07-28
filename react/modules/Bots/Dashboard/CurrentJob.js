import React from 'react';
import request from 'superagent';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';

import HoverAndClick from './HoverAndClick';
import File from '../../Files/File';

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
    const reply = confirm('Are you sure you want to cancel the job?');
    if (reply) {
      request.post(this.props.endpoint)
      .send({ command: 'cancel' })
      .set('Accept', 'application/json')
      .end();
    }
  }

  renderConnectButton() {
    if (this.props.bot.state === 'uninitialized') {
      return (
        <HoverAndClick color={{ h: this.props.appColor, s: 5, l: 40 }} >
          <button onClick={() => this.sendCommand('discover') }>Detect</button>
        </HoverAndClick>
      );
    }

    if (this.props.bot.state === 'ready') {
      return (
        <HoverAndClick color={{ h: 120, s: 40, l: 40 }} >
          <button className="connect" onClick={() => this.sendCommand('connect')}>
            Connect
          </button>
        </HoverAndClick>
      );
    }
    if (botMetaStates.connected.includes(this.props.bot.state)) {
      return (
        <HoverAndClick color={{ h: 0, s: 40, l: 40 }} >
          <button
            className="disconnect"
            onClick={() => {
              let disconnect = true;
              if (this.props.bot.currentJob) {
                disconnect = confirm('Are you sure you want to disconnect?\n Disconnecting will cancel the current job.');
              }
              if (disconnect) {
                this.sendCommand('disconnect');
              }
            }}
          >
            Disconnect
          </button>
        </HoverAndClick>
      );
    }

    return (
      <HoverAndClick color={{ h: this.props.appColor, s: 40, l: 40 }} >
        <button className="disconnect" disabled>{this.props.bot.state}</button>
      </HoverAndClick>
    );
  }

  renderPauseButton() {
    if (this.props.bot.currentJob === undefined) {
      return (
        <HoverAndClick color={{ h: 60, s: 5, l: 40 }} >
          <button className="pause-resume" disabled>Pause</button>
        </HoverAndClick>
      );
    }

    switch (this.props.bot.state) {
      case 'paused':
        return (
          <HoverAndClick color={{ h: 120, s: 40, l: 40 }} >
            <button className="resume" onClick={() => { this.sendCommand('resume'); }}>Resume</button>
          </HoverAndClick>
        );
      case 'executingJob':
        return (
          <HoverAndClick color={{ h: 60, s: 40, l: 40 }} >
            <button className="pause" onClick={() => { this.sendCommand('pause'); }}>Pause</button>
          </HoverAndClick>
        );
      default:
        return (
          <HoverAndClick color={{ h: this.props.appColor, s: 5, l: 40 }} >
            <button className="pause-resume" disabled>Pause/Resume</button>
          </HoverAndClick>
        );
    }
  }

  renderCancelButton() {
    if (this.props.bot.currentJob === undefined) {
      return (
        <HoverAndClick color={{ h: 0, s: 5, l: 40 }} >
          <button className="cancel" disabled>Cancel</button>
        </HoverAndClick>
      );
    }

    return (
      <HoverAndClick color={{ h: 0, s: 40, l: 40 }} >
        <button className="cancel" onClick={this.cancelJob}>Cancel</button>
      </HoverAndClick>
    );
  }

  findMostRecentUpload() {
    let newestFile = null;
    this.props.files && Object.entries(this.props.files).forEach(([fileKey, file]) => {
      // Don't include files that cant be processed by this bot
      const fileExtension = '.' + file.name.split('.')[file.name.split('.').length - 1];
      if (this.props.bot.info.fileTypes.includes(fileExtension)) {
        // If this file is newer than the reigning newest file, replace it
        if (!newestFile || file.dateChanged > newestFile.dateChanged) {
          newestFile = file;
        }
      }
    });
    return newestFile;
  }

  printFile(fileUuid) {
    const requestParams = {
      command: 'startJob',
      fileUuid,
    };

    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send(requestParams)
    .set('Accept', 'application/json')
    .end()
    .catch((err) => {
      // console.log('request error', err);
    });
  }

  renderProgressBar() {
    const connected = botMetaStates.connected.includes(this.props.bot.state);
    if (this.props.bot.currentJob === undefined) {
      // Render the most recent file
      const newestFile = this.findMostRecentUpload();
      if (newestFile) {
        const buttonReady = this.props.bot.state === 'idle';
        return (
          <div>
            <HoverAndClick color={{ h: 120, s: connected ? 40 : 5, l: 40 }} >
              <button
                className="pause-resume"
                disabled={!buttonReady}
                style={{ width: '100%', backgroundColor: buttonReady ? '#90bb95' : '#9FA1A4' }}
                onClick={() => this.printFile(newestFile.uuid)}
              >
              Print "{newestFile.name}"
              </button>
            </HoverAndClick>
          </div>
        );
      }
      return null;
    }
    const percentComplete = this.props.bot.currentJob.percentComplete;
    const percentTextStyle = {
      position: 'absolute',
      right: 0,
      left: 0,
      color: '#f5f5f5',
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <span style={percentTextStyle}>{`${percentComplete}%`} </span>
          <ProgressBar style={{ backgroundImage: 'none', backgroundColor: '#AEAEAE' }} active now={percentComplete} key={0} />
      </div>
    );
  }

  render() {
    return (
      <div>
        <div className="max-area-width no-margin">
          <h3>CURRENT STATE: {this.props.bot.state.toUpperCase()}</h3>
          <div className="row">
            <div className="col-xs-4 no-padding-right">
              {this.renderConnectButton()}
            </div>
            <div className="col-xs-4 no-padding">
              {this.renderPauseButton()}
            </div>
            <div className="col-xs-4 no-padding-left">
              {this.renderCancelButton()}
            </div>
          </div>
          <br />
        </div>
        <div style={{padding: "2px"}} />
        <div className="progress-area" style={ this.props.bot.currentJob ? { height: '20px', marginTop: '-10px' } : { height: '40px', marginTop: '-20px' }}>
          {this.renderProgressBar()}
        </div>
      </div>
    );
  }
}
