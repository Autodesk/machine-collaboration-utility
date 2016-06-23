import React from 'react';
import Header from './modules/Header';
import Dropzone from 'react-dropzone';
import request from 'superagent';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bots: {

      },
      jobs: {

      },
      files: {

      },
    };
  }
  onDrop(files) {
    const req = request.post('/v1/files');
    req.set('conductor', 'true');
    files.forEach((file) => {
      req.attach(file.name, file);
    });
    req.end(() => {
      // After the file is uploaded
    });
  }
  render() {
    return (
      <div>
        <Dropzone onDrop={this.onDrop}>
          <div>Try dropping some files here, or click to select files to upload.</div>
        </Dropzone>
        <Header/>
        {this.props.children}
      </div>
    );
  }
}
