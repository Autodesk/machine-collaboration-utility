import React from 'react';
import _ from 'lodash';

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
    const jobs = _.entries(this.state.jobs).map(([jobKey, job]) => {
      return <Job key={job.uuid} job={job}/>;
    });
    return (<div className="container">
      <div id="jobs">
        <h1>Jobs</h1>
        {jobs}
      </div>
    </div>);
  }
}
