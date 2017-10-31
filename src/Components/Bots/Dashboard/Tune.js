import React from 'react';
import _ from 'lodash';
import Modal from 'react-bootstrap/lib/Modal';
import autobind from 'react-autobind';
import Slider, { Range } from 'rc-slider';
import 'rc-slider/assets/index.css';

import HoverAndClick from './HoverAndClick';
import { metaStates as botMetaStates } from '../botFsmDefinitions';

export default class Tune extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showFlowrateModal: false,
      showSpeedModal: false,
      lastKnownFlowrate: 100,
      lastSentFlowrate: 100,
      lastKnownSpeed: 100,
      lastSentSpeed: 100,
    };

    autobind(this);
  }

  tuneSpeed() {
    this.setState({ showSpeedModal: true });
  }

  closeSpeedModal() {
    this.setState({ showSpeedModal: false });
  }

  updateSpeedSlider(newValue) {
    this.setState({ lastKnownSpeed: newValue });
  }

  updateSpeed(e) {
    e.preventDefault();

    const newSpeed = this.state.lastKnownSpeed;
    this.setState({ lastSentSpeed: newSpeed });

    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'processGcode',
      gcode: `M220 S${newSpeed}`,
      force: true,
    };

    // if (this.props.forceJog === true) {
    //   commandObject.force = true;
    // }

    this.props.client.emit('command', commandObject);
    setTimeout(this.closeSpeedModal, 200);
  }

  speedModal() {
    const sliderMarks = {};
    for (let i = 50; i <= 150; i += 10) {
      sliderMarks[`${i}`] = `${i}%`;
    }
    return (
      <Modal backdrop={'static'} show={this.state.showSpeedModal} onHide={this.closeSpeedModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <h1>Adjust speed</h1>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Target speed: {this.state.lastKnownSpeed}%</p>
          <p>Current speed: {this.state.lastSentSpeed}%</p>
          <form onSubmit={this.updateSpeed}>
            <Slider
              min={50}
              max={150}
              step={1}
              marks={sliderMarks}
              onChange={this.updateSpeedSlider}
              value={this.state.lastKnownSpeed}
            />
            <input type="submit" value="Update Speed" />
            <br />
            <br />
          </form>
        </Modal.Body>
      </Modal>
    );
  }

  tuneFlowrate() {
    this.setState({ showFlowrateModal: true });
  }

  closeFlowrateModal() {
    this.setState({ showFlowrateModal: false });
  }

  updateFlowrateSlider(newValue) {
    this.setState({ lastKnownFlowrate: newValue });
  }

  updateFlowrate(e) {
    e.preventDefault();
    const newFlowrate = this.state.lastKnownFlowrate;
    this.setState({ lastSentFlowrate: newFlowrate });

    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'processGcode',
      gcode: `M221 S${newFlowrate}`,
      force: true,
    };

    // if (this.props.forceJog === true) {
    //   commandObject.force = true;
    // }

    this.props.client.emit('command', commandObject);
    setTimeout(this.closeFlowrateModal, 200);
  }

  flowrateModal() {
    const sliderMarks = {};
    for (let i = 50; i <= 150; i += 10) {
      sliderMarks[`${i}`] = `${i}%`;
    }
    return (
      <Modal
        backdrop={'static'}
        show={this.state.showFlowrateModal}
        onHide={this.closeFlowrateModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <h1>Adjust flowrate</h1>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Target flowrate: {this.state.lastKnownFlowrate}%</p>
          <p>Current flowrate: {this.state.lastSentFlowrate}%</p>
          <form onSubmit={this.updateFlowrate}>
            <Slider
              min={50}
              max={150}
              step={1}
              marks={sliderMarks}
              onChange={this.updateFlowrateSlider}
              value={this.state.lastKnownFlowrate}
            />
            <input type="submit" value="Update Flowrate" />
            <br />
            <br />
          </form>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const tuneable = botMetaStates.connected.includes(this.props.bot.state);
    // this.props.bot.state === 'idle' ||
    // this.props.bot.state === 'paused' ||
    // (this.props.forceJog === true && botMetaStates.connected.includes(this.props.bot.state));

    return (
      <div>
        {this.flowrateModal()}
        {this.speedModal()}
        <div className="row">
          <div className="area-padding home-area max-area-width">
            <div className="col-xs-4 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: tuneable ? 40 : 5, l: 40 }}>
                <button disabled={!tuneable} onClick={this.tuneFlowrate}>
                  Adjust Flowrate
                </button>
              </HoverAndClick>
            </div>
            <div className="col-xs-4 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: tuneable ? 40 : 5, l: 40 }}>
                <button disabled={!tuneable} onClick={this.tuneSpeed}>
                  Adjust Speed
                </button>
              </HoverAndClick>
            </div>
            <div className="col-xs-4 no-padding">
              <HoverAndClick color={{ h: this.props.forceJog ? 0 : 120, s: 40, l: 40 }}>
                <button
                  onClick={() => {
                    this.props.toggleForceJog();
                  }}
                >
                  {this.props.forceJog ? 'Disable Live Jog' : 'Enable Live Jog'}
                </button>
              </HoverAndClick>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
