/* global APP_VAR, io */

import React from 'react';
import Dropzone from 'react-dropzone';
import request from 'superagent';
import _ from 'lodash';
import * as DeepEqual from 'deep-equal';
import Header from './modules/Header';
const equal = DeepEqual.default;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    try {
      this.state = APP_VAR;
    } catch (ex) {
      this.state = props.params;
    }

    this.state.bots = this.appendConductorPlayers(this.state.bots);

    this.state.restartWidth = '50px';

    this.openDropzone = this.openDropzone.bind(this);
    this.restart = this.restart.bind(this);
    this.updateBot = this.updateBot.bind(this);
  }

  // Add any conductor's players to the list of bots
  appendConductorPlayers(bots) {
    // Append Conductor bots here
    _.entries(bots).forEach(([uuid, bot]) => {
      if (bot.settings.custom && Array.isArray(bot.settings.custom.players)) {
        bot.settings.custom.players.forEach((player) => {
          if (player.endpoint.includes('localhost')) {
            return;
          }
          const newBot = {
            state: 'uninitialized',
            status: {
              position: {
                x: 0,
                y: 0,
                z: 0,
                e: 0,
              },
              sensors: {
                t0: {
                  temperature: 0,
                  setpoint: 0,
                },
                b0: {
                  temperature: 0,
                  setpoint: 0,
                },
              },
            },
            settings: {
              model: 'Player',
              name: player.name,
              endpoint: player.endpoint,
              jogXSpeed: 2000,
              jogYSpeed: 2000,
              jogZSpeed: 1000,
              jogESpeed: 120,
              tempE: 200,
              tempB: 0,
              offsetX: 0,
              offsetY: 0,
              offsetZ: 0,
              openString: null,
              custom: null,
              id: player.name,
              uuid: player.name,
            },
            info: {
              connectionType: 'player',
              fileTypes: ['.gcode'],
            },
            warnings: [],
          };
          if (!bots.hasOwnProperty(player.name)) {
            bots[player.name] = newBot;
          }
        });
      }
    });
    return bots;
  }

  restart() {
    request.post('/restart')
    .end();
    this.setState({
      restartWidth: '50%',
    });
    setTimeout(() => {
      location.reload();
    }, 10000);
  }

  updateBot(bot) {
    if (!equal(bot, this.state.bots[bot.settings.name])) {
      const bots = Object.assign({}, this.state.bots);
      bots[bot.settings.name] = bot;
      this.setState({ bots });
    }
  }

  componentDidMount() {
    // Don't notice socket event on the server side
    if (require('is-browser')) {
      this.socket = io();
      this.socket.on('botEvent', (bot) => {
        let bots = this.state.bots;
        switch (bot.event) {
          case 'update':
          case 'new':
            bots[bot.uuid] = bot.data;
            bots = this.appendConductorPlayers(bots);
            this.setState({ bots });
            break;
          case 'delete':
            delete bots[bot.uuid];
            bots = this.appendConductorPlayers(bots);
            this.setState({ bots });
            break;
          default:
            break;
        }
      });
      this.socket.on('fileEvent', (file) => {
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
      this.socket.on('jobEvent', (job) => {
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
  }

  onDrop(files) {
    const req = request.post('/v1/files');
    files.forEach((file) => {
      req.attach(file.name, file);
    });
    req.end(() => {
      // Called after the file is uploaded
    });
  }

  openDropzone() {
    this.refs.dropzone.open();
  }

  render() {
    const dropzoneStyle = {
      width: '100%',
      height: '100%',
    };
    const childrenComponents = React.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject server app objects
      return React.cloneElement(child, Object.assign({}, this.state, { dropzoneOpener: this.openDropzone, updateBot: this.updateBot }));
    });

    return (
      <Dropzone
        ref="dropzone"
        style={dropzoneStyle}
        onDrop={this.onDrop}
        disableClick
      >
        <Header />
        {childrenComponents}
      </Dropzone>
    );
  }
}
