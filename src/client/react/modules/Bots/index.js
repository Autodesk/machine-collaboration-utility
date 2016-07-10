import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Radio from 'react-bootstrap/lib/Radio';

import Bot from './bot';


export default class Bots extends React.Component {
  constructor(props) {
    super(props);
    this.toggleModal = this.toggleModal.bind(this);
    this.close = this.close.bind(this);
    this.handleSelectBot = this.handleSelectBot.bind(this);
    this.state = {
      showModal: false,
      // Default to the first bot in the list
      selectedBot: Object.entries(props.bots)[0][0],
    };
  }

  handleSelectBot(event) {
    this.setState({
      selectedBot: event.target.value,
    });
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

  renderBotList() {
    let defaultSet = false;
    const botRadioList = Object.entries(this.props.bots).map(([botUuid, bot]) => {
      const radioElement = <Radio inline key={botUuid} name="botList" defaultValue={botUuid} defaultChecked={!defaultSet}>{bot.settings.name}</Radio>;
      if (!defaultSet) {
        defaultSet = true;
      }
      return radioElement;
    });
    return (
      <FormGroup onChange={this.handleSelectBot}>
        {botRadioList}
      </FormGroup>
    );
  }

  render() {
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
      {this.renderBotList()}
      <Bot bot={this.props.bots[this.state.selectedBot]}/>
    </div>);
  }
}
