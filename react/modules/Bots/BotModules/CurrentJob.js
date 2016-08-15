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
        <button>Connect</button>
        <button>Pause/Resume</button>
        <button>Cancel</button>
        <ProgressBar active now={60} label={`${60}%`} />
      </div>
    );
  }
}
