import React from 'react';
import request from 'superagent';

export default class JogSpeeds extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="row">
        <h3>Position Feedback!</h3>
        <div className="col-sm-3">
          <p>X-Axis</p>
          <input type="text"/>
          <button>*</button>
        </div>
        <div className="col-sm-3">
          <p>Y-Axis</p>
          <input type="text"/>
          <button>*</button>
        </div>
        <div className="col-sm-3">
          <p>Z-Axis</p>
          <input type="text"/>
          <button>*</button>
        </div>
        <div className="col-sm-3">
          <p>E-Axis</p>
          <input type="text"/>
          <button>*</button>
        </div>
      </div>
    );
  }
}
