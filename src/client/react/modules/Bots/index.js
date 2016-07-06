import React from 'react';
import Modal from 'react-bootstrap-modal';

import Bot from './bot';


export default class Bots extends React.Component {
  constructor(props) {
    super(props);
    this.toggleModal = this.toggleModal.bind(this);
    this.close = this.close.bind(this);
    this.state = {
      showModal: false,
    };
  }

  createBot(bot) {
    return <div>{bot.settings.name}</div>;
  }

  toggleModal() {
    this.setState({
      showModal: !this.state.showModal,
    });
  }

  close() {
    this.setState({ showModal: false });
  }

  render() {
    const bots = Object.entries(this.props.bots).map(([botKey, bot]) => {
      return <Bot key={botKey} bot={bot}/>;
    });
    return (<div>
      <button onClick={this.toggleModal}>Create Bot</button>
      <Modal show={this.state.showModal} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>Create Bot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h4>Fill out all of your details here</h4>
          <p>Great job</p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={this.close}>Close</button>
        </Modal.Footer>
      </Modal>
      <div>{bots}</div>
    </div>);
  }
}
