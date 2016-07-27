/* global APP_VAR, io */

import React from 'react';
import Header from './modules/Header';
import Dropzone from 'react-dropzone';
import request from 'superagent';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    try {
      this.state = APP_VAR;
    } catch (ex) {
      this.state = props.params;
    }
    this.openDropzone = this.openDropzone.bind(this);
  }

  componentDidMount() {
    // Don't notice socket event on the server side
    if (require('is-browser')) {
      this.socket = io();
      this.socket.on('botEvent', (bot) => {
        const newBots = this.state.bots;
        switch (bot.event) {
          case `new`:
            newBots[bot.uuid] = bot.data;
            this.setState({ bots: newBots });
            break;
          case `update`:
            newBots[bot.uuid] = bot.data;
            this.setState({ bots: newBots });
            break;
          case `delete`:
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
          case `new`:
            newFiles[file.uuid] = file.data;
            this.setState({ files: newFiles });
            break;
          case `delete`:
            delete newFiles[file.uuid];
            this.setState({ files: newFiles });
            break;
          default:
            break;
        }
      });
      this.socket.on('jobEvent', (job) => {
        const newJobs = this.state.jobs;
        switch (job.event) {
          case `new`:
            newJobs[job.uuid] = job.data;
            this.setState({ jobs: newJobs });
            break;
          case `delete`:
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
      width: `100%`,
      height: `100%`,
    };
    const childrenComponents = React.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject hydraPrint app objects
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
      </Dropzone>
    );
  }
}
