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
    try {
      this.socket = io();
      this.socket.on('updateBots', (data) => {
        // console.log('updating Bots', data);
      });
      this.socket.on('updateFiles', (files) => {
        this.setState({ files });
      });
      this.socket.on('updateJobs', (jobs) => {
        this.setState({ jobs });
      });
    } catch (ex) {
      // Not possible on server side
    }
  }

  onDrop(files) {
    const req = request.post('/v1/files');
    req.set('conductor', 'true');
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
      width: "100%",
      height: "100%",
    };
    const childrenComponents = React.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject hydraPrint app objects
      return React.cloneElement(child, Object.assign({}, this.state, {dropzoneOpener: this.openDropzone}));
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
