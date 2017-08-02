import React from 'react';
import request from 'superagent';
import _ from 'lodash';

import { metaStates as botMetaStates } from '../botFsmDefinitions';
import HoverAndClick from './HoverAndClick';

export default class DisableMotors extends React.Component {
  constructor(props) {
    super(props);
  }

  disableAxes(inputAxes) {
    const axes = { x: false, y: false, z: false, e: false };
    _.extend(axes, inputAxes);
    let gcode = '';
    // WARNING. not checking to see if more than 2, less than all axes are to be disabled
    if (axes.x && axes.y && axes.z && axes.e) {
      gcode = 'M84';
    } else if (axes.x) {
      gcode = 'M84 X';
    } else if (axes.y) {
      gcode = 'M84 Y';
    } else if (axes.z) {
      gcode = 'M84 Z';
    } else if (axes.e) {
      gcode = 'M84 E';
    }

    request.post(this.props.endpoint)
    .send({ command: 'processGcode' })
    .send({ gcode })
    .set('Accept', 'application/json')
    .end();
  }

  render() {
    const disableable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    return (
      <div className="disable-motors">
        <h3>DISABLE MOTORS</h3>
        <div className="">
          <div className="col-xs-3 no-padding">
            <HoverAndClick color={{ h: this.props.appColor, s: disableable ? 40 : 5, l: 40 }} >
              <button disabled={!disableable} onClick={() => this.disableAxes({ x: true })}>X</button>
            </HoverAndClick>
          </div>
          <div className="col-xs-3 no-padding">
            <HoverAndClick color={{ h: this.props.appColor, s: disableable ? 40 : 5, l: 40 }} >
              <button disabled={!disableable} onClick={() => this.disableAxes({ y: true })}>Y</button>
            </HoverAndClick>
          </div>
          <div className="col-xs-3 no-padding">
            <HoverAndClick color={{ h: this.props.appColor, s: disableable ? 40 : 5, l: 40 }} >
              <button disabled={!disableable} onClick={() => this.disableAxes({ z: true })}>Z</button>
            </HoverAndClick>
          </div>
          <div className="col-xs-3 no-padding">
            <HoverAndClick color={{ h: this.props.appColor, s: disableable ? 40 : 5, l: 40 }} >
              <button disabled={!disableable} onClick={() => this.disableAxes({ e: true })}>E</button>
            </HoverAndClick>
          </div>
          <div className="col-sm-12 no-padding">
            <HoverAndClick color={{ h: this.props.appColor, s: disableable ? 40 : 5, l: 40 }} >
              <button disabled={!disableable} className="full-width" onClick={() => this.disableAxes({ x: true, y: true, z: true, e: true })}>All</button>
            </HoverAndClick>
          </div>
        </div>
      </div>
    );
  }
}
