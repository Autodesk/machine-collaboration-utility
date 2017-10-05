import React from 'react';

export default class Warnings extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const warnings = this.props.bot.warnings.map(warning => (
      <div key={warning.time}>{warning.type}</div>
    ));

    return (
      <div>
        <h3>Warnings</h3>
        <div className="row">{warnings}</div>
      </div>
    );
  }
}
