import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';
import Tab from 'react-bootstrap/lib/Tab';
import Tabs from 'react-bootstrap/lib/Tabs';
import request from 'superagent';
import { Link } from 'react-router';
import _ from 'underscore';

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
    };
  }

  tabSelectEvent(key) {
    this.setState({
      selectedTab: key,
    });
  }

  render() {
    return (
      <div>
        <Tabs activeKey={this.state.selectedTab} onSelect={this.tabSelectEvent}>
          <Tab eventKey={1} title="Dashboard">
            <Dashboard bot={this.props.bot}/>
          </Tab>
          <Tab eventKey={2} title="Terminal">
            <Terminal bot={this.props.bot}/>
          </Tab>
          <Tab eventKey={3} title="Settings">
            <Settings bot={this.props.bot}/>
          </Tab>
        </Tabs>
      </div>
    );
  }
}
