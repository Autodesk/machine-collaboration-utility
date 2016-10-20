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
import ConductorPlayers from './ConductorPlayers';

export default class Dashboard extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const isConductorBot = this.props.bot.settings.model.toLowerCase().includes('conductor');
    const endpoint = `/v1/bots/${this.props.bot.settings.uuid}`;
    let conductorPlayers = '';
    if (isConductorBot) {
      conductorPlayers =
        <div className="container">
          <div className="area row">
            <ConductorPlayers bot={this.props.bot}/>
          </div>
        </div>
        ;
    }

    return (
      <div id="dashboard">
        { isConductorBot ?
          <div className="container">
            <CurrentJob bot={this.props.bot}/>
          </div>
          :
          <div className="container">
            <div id="left" className="col-md-6">
              <div className="area">
                <JogPanel endpoint={endpoint}/>
              </div>
              <div className="area">
                <HomeAxes endpoint={endpoint} bot={this.props.bot}/>
              </div>
            </div>
            <div id="right" className="col-md-6">
              <div className="area">
                <CurrentJob bot={this.props.bot}/>
              </div>
              <div className="area row">
                <div className="col-sm-6 no-padding">
                  <PositionFeedback bot={this.props.bot}/>
                </div>
                <div className="col-sm-6 no-padding">
                  <DisableMotors endpoint={endpoint}/>
                </div>
              </div>
              <div className="area">
                <Temp bot={this.props.bot}/>
              </div>
            </div>
          </div>
        }
        { isConductorBot ? conductorPlayers :
          <div className="container">
            <div className="area row">
              <SendGcode endpoint={endpoint} bot={this.props.bot}/>
            </div>
          </div>
        }
      </div>
    );
  }
}
