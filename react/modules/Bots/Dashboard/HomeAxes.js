import React from 'react';
import request from 'superagent';
import _ from 'lodash';

export default class HomeAxes extends React.Component {
  constructor(props) {
    super(props);
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
    return (
      <div>
        <div className="row">
          <div className="area-padding home-area max-area-width">
            <div className="col-xs-3 no-padding">
              <button onClick={() => this.homeAxes({ x: true })}>Home X</button>
            </div>
            <div className="col-xs-3 no-padding">
            <button onClick={() => this.homeAxes({ y: true })}>Home Y</button>
            </div>
            <div className="col-xs-3 no-padding">
            <button onClick={() => this.homeAxes({ z: true })}>Home Z</button>
            </div>
            <div className="col-xs-3 no-padding">
            <button className="home-all" onClick={() => this.homeAxes({ x: true, y: true, z: true })}>Home All</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
