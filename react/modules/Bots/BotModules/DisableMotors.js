import React from 'react';
import request from 'superagent';

export default class DisableMotors extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3>Disable Motors!</h3>
        <div className="col-sm-3">
          <button>X</button>
        </div>
        <div className="col-sm-3">
          <button>Y</button>
        </div>
        <div className="col-sm-3">
          <button>Z</button>
        </div>
        <div className="col-sm-3">
          <button>E</button>
        </div>
      </div>
    );
  }
}
