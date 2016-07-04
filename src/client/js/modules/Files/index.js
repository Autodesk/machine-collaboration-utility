import React from 'react';
import Modal from 'react-bootstrap-modal';

import File from './file';

export default class Files extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
    this.handleProcessFile = this.handleProcessFile.bind(this);
    this.close = this.close.bind(this);
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

  renderModal() {
    return (
    <Modal show={this.state.showModal} onHide={this.close}>
      <Modal.Header closeButton>
        <Modal.Title>Modal heading</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>{this.state.fileUuid}</div>
        <div>{this.state.fileName}</div>
        <h4>Text in a modal</h4>
        <p>Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>

        <h4>Popover in a modal</h4>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={this.close}>Close</button>
      </Modal.Footer>
    </Modal>
    );
  }

  render() {
    const files = Object.entries(this.props.files).map(([fileKey, file]) => {
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
