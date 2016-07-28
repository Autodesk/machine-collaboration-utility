import React from 'react';

import Job from './Job';

export default class Jobs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      jobs: this.props.jobs,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ jobs: nextProps.jobs });
  }

  render() {
    const jobs = Object.entries(this.state.jobs).map(([jobKey, job]) => {
      return <Job key={job.uuid} job={job}/>;
    });
    return (<div>
      <h1>Jobs</h1>
      {jobs}
    </div>);
  }
}
