import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Radio from 'react-bootstrap/lib/Radio';
import Button from 'react-bootstrap/lib/Button';
import request from 'superagent';
import _ from 'underscore';

import Bot from './Bot';
import NavLink from '../NavLink';

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
      selectedBot: this.findSelectedBot(props),
      selectedPreset: _.pairs(props.botPresets)[0][1],
    };
  }

  // If the uuid found in the url is a known bot, then set it
  findSelectedBot(props) {
    let selectedBot;
    if (props.params.id !== undefined && _.has(props.bots, props.params.id)) {
      selectedBot = props.bots[props.params.id];
    }
    return selectedBot;
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
    const botLinkList = [];
    botLinkList.push(<Button key="createBot" className="add-bot" onClick={this.toggleModal}>+</Button>);

    const botListArray = _.pairs(this.props.bots);

    // Sort the bots alphabetically, but capital letters go before lower case letters
    botListArray.sort((a, b) => {
      return a[1].settings.name > b[1].settings.name;
    });

    // Sort the bots in alphabetical order

    for (const [botUuid, bot] of botListArray) {
      const botElement = <NavLink key={botUuid} className="bot-tabs" to={`/${botUuid}`}>{bot.settings.name}</NavLink>;
      botLinkList.push(botElement);
    };

    return (
      <div className="bot-tab-list-container">
        <div className="bot-tab-list">
          {botLinkList}
        </div>
      </div>
    );
  }

  updateSelectedPreset(event) {
    this.setState({ selectedPreset: this.props.botPresets[event.target.value] });
  }

  createPresetList() {
    const options = _.pairs(this.props.botPresets).map(([botPresetKey, botPreset]) => {
      switch (botPreset.info.connectionType) {
        case undefined:
        case 'serial':
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
      case 'hardwarehub':
      case 'telnet':
      case 'virtual':
        return (<div>
          <label htmlFor={'endpoint'}>Endpoint</label>
          <input onChange={this.updateText} type="textarea" name={'endpoint'} defaultValue={'http://127.0.0.1'} />
          <br/>
        </div>);
      default:
        return <input type="hidden" name={'endpoint'} value={undefined} />;
    }
  }

  createNewBotForm() {
    return (<div>

      <input type="hidden" name={'model'} value={this.state.selectedPreset.settings.model} />

      <label htmlFor={'name'}>Name</label>
      <input onChange={this.updateText} type="textarea" name={'name'} value={this.state.selectedPreset.settings.name} />
      <br/>

      {this.renderEndpoint(this.state.selectedPreset.info.connectionType)}

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

    request.post('/v1/bots')
    .send({ name: event.target.name.value })
    .send({ model: event.target.model.value })
    .send({ endpoint: event.target.endpoint.value })
    .send({ jogXSpeed: parseInt(event.target.jogXSpeed.value, 10) })
    .send({ jogYSpeed: parseInt(event.target.jogYSpeed.value, 10) })
    .send({ jogZSpeed: parseInt(event.target.jogZSpeed.value, 10) })
    .send({ jogESpeed: parseInt(event.target.jogESpeed.value, 10) })
    .send({ tempE: parseInt(event.target.tempE.value, 10) })
    .send({ tempB: parseInt(event.target.tempB.value, 10) })
    .send({ speedRatio: Number(event.target.speedRatio.value).toPrecision(5) })
    .send({ eRatio: Number(event.target.eRatio.value).toPrecision(5) })
    .send({ offsetX: Number(event.target.offsetX.value).toPrecision(5) })
    .send({ offsetY: Number(event.target.offsetY.value).toPrecision(5) })
    .send({ offsetZ: Number(event.target.offsetZ.value).toPrecision(5) })
    .set('Accept', 'application/json')
    .end();
  }

  componentWillReceiveProps(nextProps) {
    let newBotState = this.findSelectedBot(nextProps);

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
      selectedBot = this.state.selectedBot;
      currentJob = selectedBot.currentJob === undefined ? undefined : selectedBot.currentJob;
    }
    // if the bot doesn't exist, we want to redirect the user...
    // if the user hasn't selected a bot, redirect them to the first available bot
    const daBot = selectedBot === undefined ? '' : <Bot currentJob={currentJob} botPresets={this.props.botPresets} bot={selectedBot}/>;

    return (
      <div>
        {this.renderBotList()}
        {daBot}
        <Modal show={this.state.showModal} onHide={this.closeModal}>
          <Modal.Header closeButton>
            <Modal.Title>Create...</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.createPresetList()}
            <form onSubmit={this.addBot}>
              {this.createNewBotForm()}
              <input type="submit" value="Create"/>
            </form>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}
