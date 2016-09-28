import React from 'react';
import request from 'superagent';

export default class File extends React.Component {
  constructor(props) {
    super(props);
    this.deleteFile = this.deleteFile.bind(this);
    this.processFile = this.processFile.bind(this);
  }

  deleteFile() {
    request.delete('/v1/files')
    .send({ uuid: this.props.file.uuid })
    .set('Accept', 'application/json')
    .end();
  }

  processFile() {
    this.props.handleProcessFile(this.props.file);
  }

  render() {
    return (<div>
      <div>File UUID: {this.props.file.uuid}</div>
      <div>File name: {this.props.file.name}</div>
      <button onClick={this.processFile}>Process File</button>
      <a href={`/v1/files/${this.props.file.uuid}/download`}><button>Download</button></a>
      <button onClick={this.deleteFile}>Delete</button>
      <br></br>
      <br></br>
    </div>);
  }
}
