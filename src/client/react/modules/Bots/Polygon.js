import React from 'react';
import request from 'superagent';

export default class JogPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    request.post(this.props.endpoint)
    .send({ command: `jog` })
    .send({ axis: this.props.axis })
    .send({ amount: this.props.amount })
    .set('Accept', 'application/json')
    .end();
  }

  render() {
    return (
      <polygon fill={this.props.fillColor} onClick={this.handleClick} points={this.props.points} className="jog"/>
    );
  }
}
