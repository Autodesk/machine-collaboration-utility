import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';
import request from 'superagent';
import { Link } from 'react-router';

import JogPanel from './JogPanel';

export default class Bot extends React.Component {
  constructor(props) {
    super(props);

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.updateBot = this.updateBot.bind(this);
    this.deleteBot = this.deleteBot.bind(this);
    this.detect = this.detect.bind(this);

    this.state = {
      showModal: false,
    };
  }

  detect() {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command: `checkSubscription` })
    .end();
  }

  deleteBot() {
    request.delete(`/v1/bots/${this.props.bot.settings.uuid}`)
    .end(() => {

      // re route to homepage
    });
    this.closeModal();
  }

  connect() {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command: `connect` })
    .set('Accept', 'application/json')
    .end();
  }

  disconnect() {
    request.post(`/v1/bots/${this.props.bot.settings.uuid}`)
    .send({ command: `disconnect` })
    .set('Accept', 'application/json')
    .end();
  }

  renderConnectButton() {
    switch (this.props.bot.state) {
      case `unavailable`:
        return <Button onClick={this.detect}>Detect</Button>;
      case `ready`:
        return <Button onClick={this.connect}>Connect!</Button>;
      case `connected`:
        return <Button onClick={this.disconnect}>Disconnect!</Button>;
      default:
        return <Button disabled>Nope!</Button>;
    }
  }

  updateBot(event) {
    event.preventDefault();
    let update = request.put(`/v1/bots/${this.props.bot.settings.uuid}`)
    for (const [settingKey, setting] of Object.entries(this.props.bot.settings)) {
      const paramJson = {};
      if (event.target[settingKey] !== undefined) {
        paramJson[settingKey] = event.target[settingKey].value;
        update = update.send(paramJson);
      }
    }
    update = update.set('Accept', 'application/json');
    try {
      update.end();
      this.closeModal();
    } catch (ex) {
      console.log(`Update error`, ex);
    }
  }

  toggleModal() {
    this.setState({
      showModal: !this.state.showModal,
    });
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  renderModal() {
    return (<Modal show={this.state.showModal} onHide={this.closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Bot</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={this.updateBot}>
          {Object.entries(this.props.bot.settings).map(([settingKey, setting]) => {
            switch (settingKey) {
              case `createdAt`:
              case `updatedAt`:
              case `uuid`:
              case `id`:
              case `model`:
                return;
              case `endpoint`:
               if (this.props.botPresets[this.props.bot.settings.model].connectionType === `serial`) {
                 return;
               }
              default:
                return (<div key={settingKey}>
                  <label key={`${settingKey}label`} htmlFor={settingKey}>{settingKey}</label>
                  <input key={`${settingKey}input`} type="textarea" name={settingKey} defaultValue={setting}/>
                </div>);
            }
          })}
          <Button bsStyle="primary" type="submit">Update Bot</Button>
        </form>
      </Modal.Body>
      <br/>
      <br/>
      <br/>
      <br/>
      <Button bsStyle="danger" onClick={this.deleteBot}>Delete Bot</Button>
    </Modal>);
  }

  render() {
    return (
      <div>
        <h3>{this.props.bot.settings.name}</h3>
        {this.renderConnectButton()}
        <div>State: {this.props.bot.state}</div>
        <div>Port: {this.props.bot.port}</div>
        <JogPanel endpoint={`/v1/bots/${this.props.bot.settings.uuid}`}/>
        <Button onClick={this.toggleModal}>Edit Bot</Button>
        {this.renderModal()}
      </div>
    );
  }
}
