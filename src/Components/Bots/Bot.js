import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';
import Tab from 'react-bootstrap/lib/Tab';
import Tabs from 'react-bootstrap/lib/Tabs';
import { Link } from 'react-router';
import _ from 'lodash';

import Dashboard from './Dashboard';
import Terminal from './Terminal';
import Settings from './Settings';

export default class Bot extends React.Component {
  constructor(props) {
    super(props);

    this.tabSelectEvent = this.tabSelectEvent.bind(this);

    this.state = {
      showModal: false,
      selectedTab: 1,
      updateInterval: null,
    };
  }

  tabSelectEvent(key) {
    this.setState({
      selectedTab: key,
    });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.bot.settings.uuid !== nextProps.bot.settings.uuid) {
      if (this.state.updateInterval) {
        clearInterval(this.state.updateInterval);
      }
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
            />
          </Tab>
          <Tab eventKey={2} title="Terminal">
            <Terminal client={this.props.client} endpoint={endpoint} bot={this.props.bot} />
          </Tab>
          <Tab eventKey={3} title="Settings">
            <Settings client={this.props.client} endpoint={endpoint} bot={this.props.bot} />
          </Tab>
        </Tabs>
      </div>
    );
  }
}
