import React from 'react';
import request from 'superagent';
import _ from 'lodash';

import { metaStates as botMetaStates } from '../botFsmDefinitions';
import HoverAndClick from './HoverAndClick';

export default class HomeAxes extends React.Component {
  startHover() {
    const color = Object.assign({}, this.state.color);
    color.l += 10;
    this.setState({ color });
  }

  leaveHover() {
    const color = Object.assign({}, this.state.color);
    color.l -= 10;
    this.setState({ color });
  }

  handleClick(event) {
    event.preventDefault();
    request.post(this.props.endpoint)
    .send({ command: 'jog' })
    .send({ axis: this.props.axis })
    .send({ amount: this.props.amount })
    .set('Accept', 'application/json')
    .end();

    setTimeout(() => {
      const hslRegex = /hsl\(\s*(\d+)\s*,\s*(\d*(?:\.\d+)?%)\s*,\s*(\d*(?:\.\d+)?%)\)/ig;
      const hsl = hslRegex.exec(this.props.fillColor);
      const borderColor = Object.assign({}, this.state.borderColor);
      borderColor.l = Number(hsl[3].split('%')[0]) - 10;
      this.setState({ borderColor });
    }, this.fadeTime);

    const borderColor = Object.assign({}, this.state.borderColor);
    borderColor.l = 80;
    this.setState({ borderColor });
  }


  homeAxes(inputAxes) {
    const axes = { x: false, y: false, z: false };
    _.extend(axes, inputAxes);
    let gcode = '';
    if (axes.x && axes.y && axes.z) {
      gcode = 'G28';
    } else if (axes.x && axes.y) {
      gcode = 'G28 X Y';
    } else if (axes.x && axes.z) {
      gcode = 'G28 X Z';
    } else if (axes.y && axes.z) {
      gcode = 'G28 Y Z';
    } else if (axes.x) {
      gcode = 'G28 X';
    } else if (axes.y) {
      gcode = 'G28 Y';
    } else if (axes.z) {
      gcode = 'G28 Z';
    }

    request.post(this.props.endpoint)
    .send({ command: 'processGcode' })
    .send({ gcode })
    .set('Accept', 'application/json')
    .end((err, response) => {
      // debugger;
    });
  }

  render() {
    const homeable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    return (
      <div>
        <div className="row">
          <div className="area-padding home-area max-area-width">
            <div className="col-xs-3 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: homeable ? 40 : 5, l: 40 }} >
                <button disabled={!homeable} onClick={() => this.homeAxes({ x: true })}>
                  Home X
                </button>
              </HoverAndClick>
            </div>
            <div className="col-xs-3 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: homeable ? 40 : 5, l: 40 }} >
                <button disabled={!homeable} onClick={() => this.homeAxes({ y: true })}>
                  Home Y
                </button>
              </HoverAndClick>
            </div>
            <div className="col-xs-3 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: homeable ? 40 : 5, l: 40 }} >
                <button disabled={!homeable} onClick={() => this.homeAxes({ z: true })}>
                  Home Z
                </button>
              </HoverAndClick>
            </div>
            <div className="col-xs-3 no-padding">
              <HoverAndClick color={{ h: this.props.appColor, s: homeable ? 40 : 5, l: 40 }} >
                <button disabled={!homeable} onClick={() => this.homeAxes({ x: true, y: true, z: true })}>
                  Home All
                </button>
              </HoverAndClick>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
