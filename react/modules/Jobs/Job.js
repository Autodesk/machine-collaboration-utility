import React from 'react';
import request from 'superagent';

export default class Job extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      job: props.job,
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ job: nextProps.job });
  }

  handleClick() {
    request.delete('/v1/jobs')
    .send({ uuid: this.state.job.uuid })
    .set('Accept', 'application/json')
    .end();
  }
  render() {
    return (<div>
      <div>Job UUID: {this.state.job.uuid}</div>
      <div>Job State: {this.state.job.state}, {this.state.job.percentComplete}</div>
      <button onClick={this.handleClick}>Delete Job</button>
      <br></br>
      <br></br>
    </div>);
  }
}
