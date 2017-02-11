import React from 'react';
import request from 'superagent';

export default class CamFeed extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="camfeed">
        <img src="http://192.168.168.5:8080/?action=stream" alt="CamFeed" />
      </div>
    );
  }
}
