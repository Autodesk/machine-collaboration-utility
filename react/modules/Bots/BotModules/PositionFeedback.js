import React from 'react';
import request from 'superagent';

export default class PositionFeedback extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3>Position Feedback!</h3>
        <div className="col-sm-4">
          <h5>X-Axis</h5>
          <div>0</div>
          <button>Zero X</button>
        </div>
        <div className="col-sm-4">
          <h5>Y-Axis</h5>
          <div>0</div>
          <button>Zero Y</button>
        </div>
        <div className="col-sm-4">
          <h5>Z-Axis</h5>
          <div>0</div>
          <button>Zero Z</button>
        </div>
      </div>
    );
  }
}
