import React from 'react';

const Axis = props => (
  <div className="col-xs-3 no-padding">
    <center>
      <div>
        {props.axis.toUpperCase()}: <span className="positioning--text">{props.position}</span>
      </div>
    </center>
  </div>
);

export default class PositionFeedback extends React.Component {
  // Round the number. If no number, return a '-'
  parseNumber(number) {
    return Number.isNaN(Number(number)) ? '-' : Number(number).toFixed(3);
  }
  render() {
    const position =
      this.props.bot.status && this.props.bot.status.position
        ? this.props.bot.status.position
        : { x: '?', y: '?', z: '?', e: '?' };

    return (
      <div className="positioning">
        <div>
          <h3>POSITION</h3>
        </div>
        <div className="row">
          <Axis axis="x" position={this.parseNumber(position.x)} />
          <Axis axis="y" position={this.parseNumber(position.y)} />
          <Axis axis="z" position={this.parseNumber(position.z)} />
          <Axis axis="e" position={this.parseNumber(position.e)} />
        </div>
      </div>
    );
  }
}
