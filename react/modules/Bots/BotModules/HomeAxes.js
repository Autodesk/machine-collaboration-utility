import React from 'react';
import request from 'superagent';

export default class HomeAxes extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3>Home!</h3>
        <button>Home X</button>
        <button>Home Y</button>
        <button>Home Z</button>
        <button>Home All</button>
      </div>
    );
  }
}
