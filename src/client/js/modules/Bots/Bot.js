import React from 'react';

export default class Bot extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (<div>
      <h3>{this.props.bot.settings.name}</h3>
      <div>Port: {this.props.bot.port}</div>
    </div>);
  }
}
