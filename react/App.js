/* global APP_VAR, io */

import React from 'react';
import Dropzone from 'react-dropzone';
import request from 'superagent';

import Header from './modules/Header';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    try {
      this.state = APP_VAR;
    } catch (ex) {
      this.state = props.params;
    }
    this.state.restartWidth = '50px';

    this.openDropzone = this.openDropzone.bind(this);
    this.restart = this.restart.bind(this);
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

  componentDidMount() {
    // Don't notice socket event on the server side
    if (require('is-browser')) {
      this.socket = io();
      this.socket.on('botEvent', (bot) => {
        const newBots = this.state.bots;
        switch (bot.event) {
          case 'new':
          case 'update':
            newBots[bot.uuid] = bot.data;
            this.setState({ bots: newBots });
            break;
          case 'delete':
            delete newBots[bot.uuid];
            this.setState({ bots: newBots });
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
      // mapping through all of the children components in order to inject HardwareHub app objects
      return React.cloneElement(child, Object.assign({}, this.state, { dropzoneOpener: this.openDropzone }));
    });
    return (
      <Dropzone
        ref="dropzone"
        style={dropzoneStyle}
        onDrop={this.onDrop}
        disableClick
      >
        <Header/>
        {childrenComponents}
        <div onClick={this.restart}>
          <img style={{width:this.state.restartWidth, position:"fixed", cursor:"pointer", right:"0px", bottom:"0px"}} src="images/restart.svg"/>
        </div>
      </Dropzone>
    );
  }
}
