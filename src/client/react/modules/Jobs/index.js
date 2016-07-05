import React from 'react';

import Job from './Job';

export default class Jobs extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const jobs = Object.entries(this.props.jobs).map(([jobKey, job]) => {
      return <Job key={job.uuid} job={job}/>;
    });
    return (<div>
      <h1>Jobs</h1>
      {jobs}
    </div>);
  }
}
