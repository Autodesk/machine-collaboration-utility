import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';
import Tab from 'react-bootstrap/lib/Tab';
import Tabs from 'react-bootstrap/lib/Tabs';
import request from 'superagent';
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
    // kick off update interval
    this.setupUpdater(nextProps);
  }

// create function to start update interval
  setupUpdater(props) {
    const self = this;

    // If we have a conductor player, update the info for that player every 5 seconds
    // kick off update interval
    if (props.bot.info.connectionType === 'player' && require('is-browser')) {
      function getBot() {
        request.get(props.bot.settings.endpoint)
        .end((err, response) => {
          if (err || response.body.data == undefined) {
            return;
          }

          // Grab the bot info from the endpoint
          const bot = response.body.data;
          // Make sure to keep the existing connectionType and enpoint for this bot's state

          bot.settings.endpoint = props.bot.settings.endpoint;
          bot.info.connectionType = 'player';
          props.updateBot(bot);
        });
      }
      this.state.updateInterval = setInterval(getBot, 5000);
      getBot();
    }
  }

  componentWillMount() {
    this.setupUpdater(this.props);
  }

  componentWillUnmount() {
    if (this.state.updateInterval) {
      clearInterval(this.state.updateInterval);
    }
  }

  render() {
    const endpoint = this.props.bot.info.connectionType === 'player' ?
    this.props.bot.settings.endpoint :
    `/v1/bots/${this.props.bot.settings.uuid}`;

    return (
      <div className="container no-padding-mobile">
        <Tabs id="bot-pages" activeKey={this.state.selectedTab} onSelect={this.tabSelectEvent}>
          <Tab eventKey={1} title="Dashboard">
            <Dashboard files={this.props.files} endpoint={endpoint} bot={this.props.bot}/>
          </Tab>
          <Tab eventKey={2} title="Terminal">
            <Terminal endpoint={endpoint} bot={this.props.bot}/>
          </Tab>
          <Tab eventKey={3} title="Settings">
            <Settings endpoint={endpoint} bot={this.props.bot}/>
          </Tab>
        </Tabs>
      </div>
    );
  }
}
