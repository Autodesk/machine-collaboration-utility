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

  render() {
    const dropzoneStyle = {
      width: "100%",
      height: "100%",
    };
    const childrenComponents = React.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject hydraPrint app objects
      return React.cloneElement(child, this.state);
    });
    return (
      <div>
        <Dropzone
          style={dropzoneStyle}
          onDrop={this.onDrop}
          disableClick
        >
          <Header/>
          {childrenComponents}
        </Dropzone>
      </div>
    );
  }
}
