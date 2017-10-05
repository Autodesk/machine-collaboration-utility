import React from 'react';
import request from 'superagent';

export default class File extends React.Component {
  constructor(props) {
    super(props);
    this.deleteFile = this.deleteFile.bind(this);
    this.processFile = this.processFile.bind(this);
  }

  deleteFile() {
    request
      .delete('/v1/files')
      .send({ uuid: this.props.file.uuid })
      .set('Accept', 'application/json')
      .end();
  }

  processFile() {
    this.props.handleProcessFile(this.props.file);
  }

  render() {
    return (
      <div className="file-area row">
        <div className="file-info col-sm-8">
          <button className="delete" onClick={this.deleteFile}>
            <i className="fa fa-times" aria-hidden="true" />
          </button>
          <h2>
            {this.props.file.name} <span>{this.props.file.uuid}</span>
          </h2>
        </div>
        <div className="file-btns col-sm-4">
          <a href={`/v1/files/${this.props.file.uuid}/download`}>
            <button className="download">
              <i className="fa fa-download" aria-hidden="true" />
            </button>
          </a>
          <button className="print" onClick={this.processFile}>
            <i className="fa fa-play" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
}
