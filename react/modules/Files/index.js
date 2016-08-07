import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import request from 'superagent';
import _ from 'underscore';

import File from './File';

export default class Files extends React.Component {
  constructor(props) {
    super(props);

    // grab the first bot that is available to process a job
    let initialBotUuid = undefined;

    this.state = {
      showModal: false,
      botUuid: this.getActiveBotUuid(props),
    };
    this.handleProcessFile = this.handleProcessFile.bind(this);
    this.close = this.close.bind(this);
    this.startJob = this.startJob.bind(this);
    this.change = this.change.bind(this);
  }

  handleProcessFile(fileInfo) {
    this.setState({
      showModal: true,
      fileUuid: fileInfo.uuid,
      fileName: fileInfo.name,
    });
  }

  close() {
    this.setState({ showModal: false });
  }

  change(event) {
    this.setState({ botUuid: event.target.value });
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      botUuid: this.getActiveBotUuid(newProps),
    });
  }

  getActiveBotUuid(props) {
    if (props.conducting) {
      return -1;
    }
    for (const [botUuid, bot] of _.pairs(this.props.bots)) {
      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== `connected`) {
        continue;
      }
      return botUuid;
    }
    return undefined;
  }

  createBotList() {
    const options = [];
    if (this.props.conducting) {
      options.unshift(<option key={-1} value={-1}>Conductor</option>);
    }
    _.pairs(this.props.bots).map(([botUuid, bot]) => {
      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== `connected`) {
        return;
      }
      options.push(<option key={botUuid} value={botUuid}>{bot.settings.name}</option>);
    });
    return (
      <select name="botList" onChange={this.change} form="newJobForm">
        {options}
      </select>
    );
  }

  startJob() {
    // Create a job
    const requestParams = {
      fileUuid: this.state.fileUuid,
      botUuid: this.state.botUuid,
      startJob: true,
    };

    request.post(`/v1/jobs`)
    .send(requestParams)
    .set('Accept', 'application/json')
    .end();
    this.close();
  }

  renderModal() {
    return (
    <Modal show={this.state.showModal} onHide={this.close}>
      <Modal.Header closeButton>
        <Modal.Title>Modal heading</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>{this.state.fileUuid}</div>
        <div>{this.state.fileName}</div>
        {this.createBotList()}
        <button onClick={this.startJob}>Start Job</button>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={this.close}>Close</button>
      </Modal.Footer>
    </Modal>
    );
  }

  render() {
    const files = _.pairs(this.props.files).map(([fileKey, file]) => {
      return <File key={file.uuid} file={file} handleProcessFile={this.handleProcessFile}/>;
    });
    return (<div>
      {this.renderModal()}
      <h1>Files</h1>
      <button onClick={this.props.dropzoneOpener}>Upload File</button>
      <br></br>
      <br></br>
      <div>{files}</div>
    </div>);
  }
}
