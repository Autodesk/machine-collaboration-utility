import React from 'react';
import Tab from 'react-bootstrap/lib/Tab';
import Tabs from 'react-bootstrap/lib/Tabs';
import autobind from 'react-autobind';

import Dashboard from './Dashboard';
import Terminal from './Terminal';
import Camera from './Camera';
import Settings from './Settings';

export default class Bot extends React.Component {
  constructor(props) {
    super(props);

    this.tabSelectEvent = this.tabSelectEvent.bind(this);

    this.state = {
      showModal: false,
      selectedTab: 1,
      updateInterval: null,
      forceJog: false,
    };

    autobind(this);
  }

  tabSelectEvent(key) {
    this.setState({
      selectedTab: key,
    });
  }

  componentWillReceiveProps(nextProps) {
    // When a new bot is selected
    if (this.props.bot.settings.uuid !== nextProps.bot.settings.uuid) {
      const newState = {};

      // Clear the updater
      if (this.state.updateInterval) {
        clearInterval(this.state.updateInterval);
      }

      // Disable force jog
      newState.forceJog = false;

      this.setState(newState);
    }
  }

  toggleForceJog() {
    if (this.state.forceJog === false) {
      // eslint-disable-next-line no-restricted-globals
      const toggle = confirm(
        'Enable Live Jog? This will allow you to send GCode while a job is being processed.',
      );
      if (toggle) {
        this.setState({ forceJog: !this.state.forceJog });
      }
    } else {
      this.setState({ forceJog: !this.state.forceJog });
    }
  }

  render() {
    const endpoint =
      this.props.bot.info.connectionType === 'player'
        ? this.props.bot.settings.endpoint
        : this.props.bot.settings.uuid;

    return (
      <div className="container no-padding-mobile">
        <Tabs id="bot-pages" activeKey={this.state.selectedTab} onSelect={this.tabSelectEvent}>
          <Tab eventKey={1} title="Dashboard">
            <Dashboard
              appColor={this.props.appColor}
              files={this.props.files}
              endpoint={endpoint}
              client={this.props.client}
              bot={this.props.bot}
              forceJog={this.state.forceJog}
              toggleForceJog={this.toggleForceJog}
            />
          </Tab>
          <Tab eventKey={2} title="Terminal">
            <Terminal
              bot={this.props.bot}
              open={this.state.selectedTab === 2}
              client={this.props.client}
              forceJog={this.state.forceJog}
              endpoint={endpoint}
            />
          </Tab>
          <Tab eventKey={3} title="Camera">
            <Camera
              bot={this.props.bot}
              open={this.state.selectedTab === 3}
              client={this.props.client}
              endpoint={endpoint}
            />
          </Tab>
          <Tab eventKey={4} title="Settings">
            <Settings client={this.props.client} endpoint={endpoint} bot={this.props.bot} />
          </Tab>
        </Tabs>
      </div>
    );
  }
}
