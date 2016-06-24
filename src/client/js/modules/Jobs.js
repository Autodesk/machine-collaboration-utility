import React from 'react';

export default class Jobs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hydraPrint: props.params.hydraPrint,
    };
  }
  createJob(job) {
    return <div>{job.uuid}</div>
  }

  render() {
    const jobs = Object.entries(this.state.hydraPrint.jobs).map((jobKey, job) => {
      return this.createJob(job);
    });
    return <div>{jobs}</div>;
  }
}
