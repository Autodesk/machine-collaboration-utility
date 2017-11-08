import React from 'react';

import JogPanel from './JogPanel';
import CurrentJob from './CurrentJob';
import HomeAxes from './HomeAxes';
import PositionFeedback from './PositionFeedback';
import DisableMotors from './DisableMotors';
import Temp from './Temp';
import Tune from './Tune';
import SendGcode from './SendGcode';
import ConductorPlayers from './ConductorPlayers';
import Warnings from './Warnings';

export default class Dashboard extends React.Component {
  render() {
    const isConductorBot = this.props.bot.settings.model.toLowerCase().includes('conductor');
    let conductorPlayers = '';
    if (isConductorBot) {
      conductorPlayers = (
        <div className="container">
          <div className="area row">
            <ConductorPlayers
              client={this.props.client}
              endpoint={this.props.endpoint}
              bot={this.props.bot}
            />
          </div>
        </div>
      );
    }

    return (
      <div id="dashboard">
        {isConductorBot ? (
          <div className="area">
            <CurrentJob
              appColor={this.props.appColor}
              files={this.props.files}
              client={this.props.client}
              endpoint={this.props.endpoint}
              bot={this.props.bot}
            />
          </div>
        ) : (
          <div className="container no-padding-mobile">
            <div id="left" className="col-md-6">
              <div className="area">
                <JogPanel
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
              <div className="area">
                <PositionFeedback
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
              <div className="area">
                <HomeAxes
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
            </div>
            <div id="right" className="col-md-6">
              <div className="area">
                <CurrentJob
                  appColor={this.props.appColor}
                  files={this.props.files}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
              <div className="area">
                <DisableMotors
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
              <div className="area">
                <Temp
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
              <div className="area">
                <Tune
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                  toggleForceJog={this.props.toggleForceJog}
                />
              </div>
              <div className="area">
                <SendGcode
                  appColor={this.props.appColor}
                  client={this.props.client}
                  endpoint={this.props.endpoint}
                  bot={this.props.bot}
                  forceJog={this.props.forceJog}
                />
              </div>
            </div>
            {this.props.bot.warnings.length > 0 ? (
              <div className="col-md-12">
                <Warnings bot={this.props.bot} />
              </div>
            ) : (
              ''
            )}
          </div>
        )}
        {isConductorBot ? conductorPlayers : ''}
      </div>
    );
  }
}
