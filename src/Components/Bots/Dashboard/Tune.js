import React from 'react';
import _ from 'lodash';
import Modal from 'react-bootstrap/lib/Modal';
import autobind from 'react-autobind';
import Slider, { Range } from 'rc-slider';
import 'rc-slider/assets/index.css';

import HoverAndClick from './HoverAndClick';

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
    this.setState({ lastSentSpeed: this.state.lastKnownSpeed });
  }

  speedModal() {
    const sliderMarks = {};
    for (let i = 50; i <= 150; i += 10) {
      sliderMarks[`${i}`] = i;
    }
    return (
      <Modal show={this.state.showSpeedModal} onHide={this.closeSpeedModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <h1>Adjust speed</h1>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Desired speed: {this.state.lastKnownSpeed}</p>
          <p>Current speed: {this.state.lastSentSpeed}</p>
          <form onSubmit={this.updateSpeed}>
            <Slider
              min={50}
              max={150}
              step={1}
              marks={sliderMarks}
              onChange={this.updateSpeedSlider}
              value={this.state.lastKnownSpeed}
            />
            <input type="submit" value="Update Flowrate" />
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
    this.setState({ lastSentFlowrate: this.state.lastKnownFlowrate });
  }

  flowrateModal() {
    const sliderMarks = {};
    for (let i = 50; i <= 150; i += 10) {
      sliderMarks[`${i}`] = i;
    }
    return (
      <Modal show={this.state.showFlowrateModal} onHide={this.closeFlowrateModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <h1>Adjust flowrate</h1>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Desired flowrate: {this.state.lastKnownFlowrate}</p>
          <p>Current flowrate: {this.state.lastSentFlowrate}</p>
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
    return (
      <div>
        {this.flowrateModal()}
        {this.speedModal()}
        <div className="row">
          <div className="area-padding home-area max-area-width">
            <div className="col-xs-4 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: 40, l: 40 }}>
                <button onClick={this.tuneFlowrate}>Adjust Flowrate</button>
              </HoverAndClick>
            </div>
            <div className="col-xs-4 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: 40, l: 40 }}>
                <button onClick={this.tuneSpeed}>Adjust Speed</button>
              </HoverAndClick>
            </div>
            <div className="col-xs-4 no-padding">
              <HoverAndClick
                color={{ h: this.props.appColor, s: this.props.forceJog ? 40 : 5, l: 40 }}
              >
                <button
                  onClick={() => {
                    this.props.toggleForceJog();
                  }}
                >
                  Force Jog
                </button>
              </HoverAndClick>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
