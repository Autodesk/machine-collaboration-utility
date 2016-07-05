import React from 'react';
import request from 'superagent';

export default class Job extends React.Component {
  constructor(props) {
    super(props);
    this.state = props.job;
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    request.delete(`/v1/jobs`)
    .send({ uuid: this.state.uuid })
    .set('Accept', 'application/json')
    .end();
  }
  render() {
    return (<div>
      <div>Job UUID: {this.state.uuid}</div>
      <div>Job State: {this.state.state}</div>
      <button onClick={this.handleClick}>Delete Job</button>
      <br></br>
      <br></br>
    </div>);
  }
}
