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
      bot: this.props.bot,
    };
  }

  tabSelectEvent(key) {
    this.setState({
      selectedTab: key,
    });
  }

  componentWillMount() {
    const self = this;

    // If we have a conductor player, update the info for that player every 5 seconds
    if (this.state.bot.info.connectionType === 'player' && require('is-browser')) {
      function updateBot() {
        request.get(self.state.bot.settings.endpoint)
        .end((err, response) => {
          if (err) {
            return;
          }

          // Grab the bot info from the endpoint
          const bot = response.body.data;
          // Make sure to keep the existing connectionType and enpoint for this bot's state

          bot.settings.endpoint = self.state.bot.settings.endpoint;
          bot.info.connectionType = 'player';
          self.setState({ bot });
        });
      }
      const updateBotInterval = setInterval(updateBot, 5000);
      updateBot();
    }
  }

  render() {
    const endpoint = this.props.bot.info.connectionType === 'player' ?
    this.props.bot.settings.endpoint :
    `/v1/bots/${this.props.bot.settings.uuid}`;

    return (
      <div className="container">
        <Tabs id="bot-pages" activeKey={this.state.selectedTab} onSelect={this.tabSelectEvent}>
          <Tab eventKey={1} title="Dashboard">
            <Dashboard endpoint={endpoint} bot={this.state.bot}/>
          </Tab>
          <Tab eventKey={2} title="Terminal">
            <Terminal endpoint={endpoint} bot={this.state.bot}/>
          </Tab>
          <Tab eventKey={3} title="Settings">
            <Settings endpoint={endpoint} bot={this.state.bot}/>
          </Tab>
        </Tabs>
      </div>
    );
  }
}
