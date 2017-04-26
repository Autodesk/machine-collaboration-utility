import React from 'react';
import request from 'superagent';

export default class Warnings extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const warnings = this.props.bot.warnings.map((warning) => {
      return <div key={warning.time}>{warning.type}</div>;
    });

    return (
      <div>
        <h3>Warnings</h3>
        <div className="row">
          {warnings}
        </div>
      </div>
    );
  }
}
