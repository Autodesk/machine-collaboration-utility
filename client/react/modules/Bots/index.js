import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Radio from 'react-bootstrap/lib/Radio';
import Button from 'react-bootstrap/lib/Button';
import request from 'superagent';

import Bot from './Bot';


export default class Bots extends React.Component {
  constructor(props) {
    super(props);
    this.toggleModal = this.toggleModal.bind(this);
    this.addBot = this.addBot.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.updateSelectedPreset = this.updateSelectedPreset.bind(this);
    this.handleSelectBot = this.handleSelectBot.bind(this);
    this.updateText = this.updateText.bind(this);

    this.state = {
      showModal: false,
      selectedBot: Object.entries(props.bots).length > 0 ? Object.entries(props.bots)[0][0]: undefined,
      selectedPreset: Object.entries(props.botPresets)[0][1],
    };
  }

  updateText(event) {
    const newPreset = Object.assign({}, this.state.selectedPreset);
    newPreset.settings[event.target.name] = event.target.value;
    this.setState({ selectedPreset: newPreset });
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

  closeModal() {
    this.setState({ showModal: false });
  }

  renderBotList() {
    let defaultSet = false;
    const botRadioList = Object.entries(this.props.bots).map(([botUuid, bot]) => {
      const radioElement = <Radio inline key={botUuid} name="botList" defaultValue={botUuid} checked={this.state.selectedBot === botUuid}>{bot.settings.name}</Radio>;
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

  updateSelectedPreset(event) {
    this.setState({ selectedPreset: this.props.botPresets[event.target.value] });
  }

  createPresetList() {
    const options = Object.entries(this.props.botPresets).map(([botPresetKey, botPreset]) => {
      switch (botPreset.connectionType) {
        case undefined:
        case `serial`:
          return;
        default:
          break;
      }
      return <option key={botPresetKey} value={botPresetKey}>{botPreset.settings.name}</option>;
    });
    return (
      <select onChange={this.updateSelectedPreset} name="botList" form="newBotForm">
        {options}
      </select>
    );
  }

  renderEndpoint(connectionType) {
    switch (connectionType) {
      case 'hydraprint':
      case 'telnet':
      case 'virtual':
        return (<div>
          <label htmlFor={'endpoint'}>Endpoint</label>
          <input onChange={this.updateText} type="textarea" name={'endpoint'} defaultValue={'http://127.0.0.1'} />
          <br/>
        </div>);
      default:
        <input type="hidden" name={'endpoint'} value={undefined} />
        break;
    }
  }

  createNewBotForm() {
    return(<div>

      <input type="hidden" name={'model'} value={this.state.selectedPreset.settings.model} />

      <label htmlFor={'name'}>Name</label>
      <input onChange={this.updateText} type="textarea" name={'name'} value={this.state.selectedPreset.settings.name} />
      <br/>

      {this.renderEndpoint(this.state.selectedPreset.connectionType)}

      <label htmlFor={'jogXSpeed'}>Jog Speed X</label>
      <input onChange={this.updateText} type="textarea" name={'jogXSpeed'} value={this.state.selectedPreset.settings.jogXSpeed} />
      <br/>

      <label htmlFor={'jogYSpeed'}>Jog Speed Y</label>
      <input onChange={this.updateText} type="textarea" name={'jogYSpeed'} value={this.state.selectedPreset.settings.jogYSpeed} />
      <br/>

      <label htmlFor={'jogZSpeed'}>Jog Speed Z</label>
      <input onChange={this.updateText} type="textarea" name={'jogZSpeed'} value={this.state.selectedPreset.settings.jogZSpeed} />
      <br/>

      <label htmlFor={'jogESpeed'}>Jog Speed E</label>
      <input onChange={this.updateText} type="textarea" name={'jogESpeed'} value={this.state.selectedPreset.settings.jogESpeed} />
      <br/>

      <label htmlFor={'tempE'}>Default Extruder Temp</label>
      <input onChange={this.updateText} type="textarea" name={'tempE'} value={this.state.selectedPreset.settings.tempE} />
      <br/>

      <label htmlFor={'tempB'}>Default Bed Temp</label>
      <input onChange={this.updateText} type="textarea" name={'tempB'} value={this.state.selectedPreset.settings.tempB} />
      <br/>

      <input type="hidden" name={'speedRatio'} value={this.state.selectedPreset.settings.speedRatio} />
      <input type="hidden" name={'eRatio'} value={this.state.selectedPreset.settings.eRatio} />
      <input type="hidden" name={'offsetX'} value={this.state.selectedPreset.settings.offsetX} />
      <input type="hidden" name={'offsetY'} value={this.state.selectedPreset.settings.offsetY} />
      <input type="hidden" name={'offsetZ'} value={this.state.selectedPreset.settings.offsetZ} />

    </div>);
  }

  addBot(event) {
    this.closeModal();
    event.preventDefault();

    request.post(`/v1/bots`)
    .send({ name: event.target.name.value })
    .send({ model: event.target.model.value })
    .send({ jogXSpeed: event.target.jogXSpeed.value })
    .send({ jogYSpeed: event.target.jogYSpeed.value })
    .send({ jogZSpeed: event.target.jogZSpeed.value })
    .send({ jogESpeed: event.target.jogESpeed.value })
    .send({ tempE: event.target.tempE.value })
    .send({ tempB: event.target.tempB.value })
    .send({ speedRatio: event.target.speedRatio.value })
    .send({ eRatio: event.target.eRatio.value })
    .send({ offsetX: event.target.offsetX.value })
    .send({ offsetY: event.target.offsetY.value })
    .send({ offsetZ: event.target.offsetZ.value })
    .set('Accept', 'application/json')
    .end();
  }

  componentWillReceiveProps(nextProps) {
    let newBotState = this.state.selectedBot;
    if (Object.entries(nextProps.bots).length <= 0) {
      newBotState = undefined;
    } else {
      if (nextProps.bots[this.state.selectedBot] === undefined) {
        newBotState = Object.entries(nextProps.bots).length > 0 ?
          Object.entries(nextProps.bots)[0][0] : undefined;
      }
    }
    if (this.state.selectedBot !== newBotState) {
      this.setState({ selectedBot: newBotState });
    }
  }

  render() {
    let selectedBot;
    let currentJob;
    if (this.state.selectedBot === undefined) {
      selectedBot = undefined;
      currentJob = undefined;
    } else {
      selectedBot = this.props.bots[this.state.selectedBot];
      currentJob = selectedBot.currentJob === undefined ? undefined : this.props.jobs[selectedBot.currentJob];
    }

    return (
      <div>
        <Button style={{margin: "10px"}} onClick={this.toggleModal}>Create Bot</Button>
        {this.renderBotList()}
        {
          this.state.selectedBot === undefined ? '' : <Bot currentJob={currentJob} conducting={this.props.conducting} botPresets={this.props.botPresets} bot={selectedBot}/>
        }
        <Modal show={this.state.showModal} onHide={this.closeModal}>
          <Modal.Header closeButton>
            <Modal.Title>Create Bot</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.createPresetList()}
            <form onSubmit={this.addBot}>
              {this.createNewBotForm()}
              <input type="submit" value="Create Bot"/>
            </form>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}
