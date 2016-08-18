import React from 'react';
import request from 'superagent';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';

import JogPanel from './JogPanel';
import CurrentJob from './CurrentJob';
import HomeAxes from './HomeAxes';
import PositionFeedback from './PositionFeedback';
import DisableMotors from './DisableMotors';
import Temp from './Temp';
import SendGcode from './SendGcode';

export default class Dashboard extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const endpoint = `/v1/bots/${this.props.bot.settings.uuid}`;

    return (
      <div id="dashboard">
        <div className="container">
          <div id="left" className="col-md-6">
            <div className="area">
              <JogPanel endpoint={endpoint}/>
            </div>
            <div className="area">
              <HomeAxes endpoint={endpoint} bot={this.props.bot}/>
            </div>
          </div>{/* END LEFT */}
          <div id="right" className="col-md-6">
            <div className="area">
              <CurrentJob bot={this.props.bot}/>
            </div>
            <div className="area row">
              <div className="col-sm-6">
                <PositionFeedback bot={this.props.bot}/>
              </div>
              <div className="col-sm-6">
                <DisableMotors endpoint={endpoint}/>
              </div>
            </div>
            <div className="area">
              <Temp bot={this.props.bot}/>
            </div>
            <div className="area">
              <SendGcode endpoint={endpoint}/>
            </div>
          </div> {/* END RIGHT */}
        </div>{/* END CONTAINER */}
      </div>
    );
  }
}
