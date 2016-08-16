import React from 'react';
import request from 'superagent';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';

export default class CurrentJob extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3>Current Job!</h3>
        <div className="row">
          <div className="col-sm-4">
            <button>Connect</button>
          </div>
          <div className="col-sm-4">
            <button>Pause/Resume</button>
          </div>
          <div className="col-sm-4">
            <button>Cancel</button>
          </div>
        </div>
        <br/>
        <ProgressBar active now={60} label={`${60}%`} />
      </div>
    );
  }
}
