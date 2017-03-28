import React from 'react';
import request from 'superagent';
import _ from 'lodash';

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
    return (
      <div className="disable-motors">
        <h3>DISABLE MOTORS</h3>
        <div className="row">
          <div className="col-xs-3">
            <button onClick={() => this.disableAxes({ x: true })}>X</button>
          </div>
          <div className="col-xs-3">
            <button onClick={() => this.disableAxes({ y: true })}>Y</button>
          </div>
          <div className="col-xs-3">
            <button onClick={() => this.disableAxes({ z: true })}>Z</button>
          </div>
          <div className="col-xs-3">
            <button onClick={() => this.disableAxes({ e: true })}>E</button>
          </div>
          <div className="col-sm-12">
            <button className="full-width" onClick={() => this.disableAxes({ x: true, y: true, z: true, e: true })}>All</button>
          </div>
        </div>
      </div>
    );
  }
}
