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
    const botUuid = event.target.value;
    this.setState({ botUuid });
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      botUuid: this.getActiveBotUuid(newProps),
    });
  }

  getActiveBotUuid(props) {
    // In case the botUuid is already set, just check to make sure that the bot is still connected
    if (this.state && this.state.botUuid !== undefined) {
      if (this.props.bots[this.state.botUuid].state === 'connected') {
        return this.state.botUuid;
      }
    }
    for (const [botUuid, bot] of _.pairs(this.props.bots)) {
      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== 'connected') {
        continue;
      }
      return botUuid;
    }
    return undefined;
  }

  createBotList() {
    const options = [];
    _.pairs(this.props.bots).map(([botUuid, bot]) => {
      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== 'connected') {
        return;
      }

      // If the bot specifies an array of supported file fileTypes
      // Then make sure the selected file is consumable by the bot
      if (bot.info.fileTypes.length > 0) {
        const supportedFileList = bot.info.fileTypes.filter(filetype => {
          return this.state.fileName && this.state.fileName.indexOf(filetype) !== -1;
        });
        if (supportedFileList.length <= 0) {
          return;
        }
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

    request.post('/v1/jobs')
    .send(requestParams)
    .set('Accept', 'application/json')
    .end();
    this.close();
  }

  renderModal() {
    return (
    <Modal show={this.state.showModal} onHide={this.close}>
      <Modal.Header closeButton>
        <Modal.Title>Select bot to process file</Modal.Title>
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
    const fileListArray = _.pairs(this.props.files);

    // Sort the files so the most recently used is first
    fileListArray.sort((a, b) => {
      return new Date(a[1].dateChanged).getTime() > new Date(b[1].dateChanged).getTime();
    });

    const files = fileListArray.map(([fileKey, file]) => {
      return <File key={file.uuid} file={file} handleProcessFile={this.handleProcessFile}/>;
    });

    return (<div>
      {this.renderModal()}
      <div id="files" className="container">
        <h1>Files</h1>
        <button className="upload" onClick={this.props.dropzoneOpener}>Upload File</button>
        <br></br>
        <br></br>
        <div>{files}</div>
      </div>
    </div>);
  }
}
