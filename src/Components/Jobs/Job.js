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
    request
      .delete('/v1/jobs')
      .send({ uuid: this.state.job.uuid })
      .set('Accept', 'application/json')
      .end();
  }
  render() {
    const progressStyle = {
      width: '45%',
    };
    return (
      <div className="file-area row">
        <div className="file-info col-sm-8">
          <button className="delete" onClick={this.handleClick}>
            <i className="fa fa-times" aria-hidden="true" />
          </button>
          <h2>
            {this.state.job.state} <span>{this.state.job.uuid} </span>
          </h2>
        </div>
        <div className="file-btns col-sm-4">
          <p>{this.state.job.percentComplete}</p>

          <div className="progress">
            <div
              className="progress-bar progress-bar-striped active"
              role="progressbar"
              aria-valuenow="45"
              aria-valuemin="0"
              aria-valuemax="100"
              style={progressStyle}
            >
              <span className="sr-only">45%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
