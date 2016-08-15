import React from 'react';
import request from 'superagent';

export default class Temp extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="row">
        <h3>Position Feedback!</h3>
        <div className="col-sm-3">
          <p>&#x25EF; Extruder</p>
        </div>
        <div className="col-sm-3">
          <div className="row">
            <input type="text" className="col-sm-5"/>
            <button className="col-sm-1">*</button>
          </div>
        </div>
        <div className="col-sm-3">
          <p>188.3</p>
        </div>
        <div className="col-sm-3">
          <button>On/Off</button>
        </div>
      </div>
    );
  }
}
