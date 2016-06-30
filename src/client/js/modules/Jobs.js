import React from 'react';

export default class Jobs extends React.Component {
  constructor(props) {
    super(props);
  }
  createJob(job) {
    return (<div>
      <div>Job UUID: {job.uuid}</div>
      <div>Job State: {job.state}</div>
      <br></br>
    </div>);
  }

  render() {
    const jobs = Object.entries(this.props.jobs).map(([jobKey, job]) => {
      return this.createJob(job);
    });
    return <div>{jobs}</div>;
  }
}
