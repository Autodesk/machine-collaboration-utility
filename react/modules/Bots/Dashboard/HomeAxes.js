import React from 'react';
import request from 'superagent';

export default class HomeAxes extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3>Home!</h3>
        <div className="row">
          <div className="col-sm-3">
            <button>Home X</button>
          </div>
          <div className="col-sm-3">
            <button>Home Y</button>
          </div>
          <div className="col-sm-3">
            <button>Home Z</button>
          </div>
          <div className="col-sm-3">
            <button>Home All</button>
          </div>
        </div>
      </div>
    );
  }
}
