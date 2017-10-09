import React, { Component } from 'react';
import { HashRouter } from 'react-router-dom';
import io from 'socket.io-client';
import bluebird from 'bluebird';

import './main.css';

import Header from './Components/Header';
import Routes from './Routes';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      client: new io(),
      bots: {},
      botPresets: {},
      jobs: {},
      files: {},
      appColor: 210,
    };

    this.state.client.on('botEvent', (bot) => {
      const bots = this.state.bots;
      switch (bot.event) {
        case 'update':
        case 'new':
          bots[bot.uuid] = bot.data;
          // bots = this.appendConductorPlayers(bots);
          this.setState({ bots });
          break;
        case 'delete':
          delete bots[bot.uuid];
          // bots = this.appendConductorPlayers(bots);
          this.setState({ bots });
          break;
        default:
          break;
      }
    });

    this.state.client.on('fileEvent', (file) => {
      const newFiles = this.state.files;
      switch (file.event) {
        case 'new':
          newFiles[file.uuid] = file.data;
          this.setState({ files: newFiles });
          break;
        case 'delete':
          delete newFiles[file.uuid];
          this.setState({ files: newFiles });
          break;
        default:
          break;
      }
    });

    this.state.client.on('jobEvent', (job) => {
      const newJobs = this.state.jobs;
      const newBots = this.state.bots;
      switch (job.event) {
        case 'new':
        case 'update':
          newJobs[job.uuid] = job.data;
          try {
            newBots[job.data.botUuid].currentJob = job.data;
          } catch (ex) {
            console.log('Failed to update bots from job event', ex);
          }
          this.setState({
            jobs: newJobs,
            bots: newBots,
          });
          break;
        case 'delete':
          delete newJobs[job.uuid];
          this.setState({ jobs: newJobs });
          break;
        default:
          break;
      }
    });
  }

  async getBots() {
    try {
      const reply = await fetch('/v1/bots');
      const data = await reply.json();
      return data.data;
    } catch (ex) {
      console.log('Get bots error', ex);
    }
  }

  async getFiles() {
    try {
      const reply = await fetch('/v1/files');
      const data = await reply.json();
      return data.data;
    } catch (ex) {
      console.log('Get bots error', ex);
    }
  }

  async getJobs() {
    try {
      const reply = await fetch('/v1/jobs');
      const data = await reply.json();
      return data.data;
    } catch (ex) {
      console.log('Get bots error', ex);
    }
  }

  async getBotPresets() {
    try {
      const reply = await fetch('/v1/bots/presets');
      const data = await reply.json();
      return data.data;
    } catch (ex) {
      console.log('Get bots error', ex);
    }
  }

  async componentWillMount() {
    try {
      const replies = await bluebird.map(
        ['getBots', 'getFiles', 'getJobs', 'getBotPresets'],
        async command => await this[command](),
      );

      this.setState({
        bots: replies[0],
        files: replies[1],
        jobs: replies[2],
        botPresets: replies[3],
      });
    } catch (ex) {
      console.log('Initial load fail', ex);
    }
  }

  render() {
    const Router = HashRouter;
    return (
      <div>
        <Router>
          <div>
            <Header {...this.state} />
            <Routes {...this.state} />
          </div>
        </Router>
      </div>
    );
  }
}

export default App;
