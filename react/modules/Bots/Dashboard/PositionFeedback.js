import React from 'react';
import request from 'superagent';
import _ from 'lodash';

import { metaStates as botMetaStates } from '../botFsmDefinitions';
import HoverAndClick from './HoverAndClick';

export default class PositionFeedback extends React.Component {
  constructor(props) {
    super(props);

    this.zeroAxis = this.zeroAxis.bind(this);
  }

  zeroAxis(inputAxes) {
    const axes = { x: false, y: false, z: false };
    _.extend(axes, inputAxes);
    let gcode = '';
    if (axes.x) {
      gcode = 'G92 X0';
    } else if (axes.y) {
      gcode = 'G92 Y0';
    } else if (axes.z) {
      gcode = 'G92 Z0';
    }

    request.post(this.props.endpoint)
    .send({ command: 'processGcode' })
    .send({ gcode })
    .set('Accept', 'application/json')
    .end();
  }

  // Round the number. If no number, return a '-'
  parseNumber(number) {
    return Number.isNaN(Number(number)) ? '-' : Number(number).toFixed(3);
  }
  render() {
    const zeroable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    const position = this.props.bot.status && this.props.bot.status.position ?
      this.props.bot.status.position : { x: '?', y: '?', z: '?', e: '?' };

      return (
      <div className="positioning">
        <h3>POSITIONING</h3>
        <div className="col-xs-4 no-padding">
          <h5>X-Axis</h5>
          <div>{this.parseNumber(position.x)}</div>
          <HoverAndClick color={{ h: this.props.appColor, s: zeroable ? 40 : 5, l: 40 }} >
            <button disabled={!zeroable} onClick={() => { this.zeroAxis({ x: true }); }}>Zero X</button>
          </HoverAndClick>
        </div>
        <div className="col-xs-4 no-padding">
          <h5>Y-Axis</h5>
          <div>{this.parseNumber(position.y)}</div>
          <HoverAndClick color={{ h: this.props.appColor, s: zeroable ? 40 : 5, l: 40 }} >
            <button disabled={!zeroable} onClick={() => { this.zeroAxis({ y: true }); }}>Zero Y</button>
          </HoverAndClick>
        </div>
        <div className="col-xs-4 no-padding">
          <h5>Z-Axis</h5>
          <div>{this.parseNumber(position.z)}</div>
          <HoverAndClick color={{ h: this.props.appColor, s: zeroable ? 40 : 5, l: 40 }} >
            <button disabled={!zeroable} onClick={() => { this.zeroAxis({ z: true }); }}>Zero Z</button>
          </HoverAndClick>
        </div>
      </div>
    );
  }
}
