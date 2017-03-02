import React from 'react';
import request from 'superagent';
import _ from 'underscore';
import Button from 'react-bootstrap/lib/Button';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);

    // Replace any undefined or null with a blank string
    const settings = props.bot.settings;
    for (const [settingKey, setting] of _.pairs(settings)) {
      if (setting == undefined) {
        settings[settingKey] = '';
      }
    }

    this.state = {
      settings,
    }

    this.updateBotSettings = this.updateBotSettings.bind(this);
    this.deleteBot = this.deleteBot.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const settings = nextProps.bot.settings;
    let updateSettings = false;

    for (const [settingKey, setting] of _.pairs(settings)) {
      const newSetting = setting == undefined ? '' : setting;
      const oldSetting = this.props.bot.settings[settingKey] == undefined ? '' : this.props.bot.settings[settingKey];
      if (newSetting !== oldSetting) {
        updateSettings = true;
      }
    }
    if (updateSettings) {
      this.setState({
        settings,
      });
    }
  }

  updateBotSettings(event) {
    event.preventDefault();
    const endpoint = `/v1/bots/${this.props.bot.settings.uuid}`;
    let update = request.put(endpoint);
    const paramJson = {};
    for (const [settingKey, setting] of _.pairs(this.state.settings)) {
      try {
        const newValue = event.target[settingKey].value;
        paramJson[settingKey] = newValue;
      } catch (ex) {
        // Value not listed as a part of the input form, don't add it
      }
    }
    update = update.send(paramJson);
    update = update.set('Accept', 'application/json');
    try {
      update.end();
    } catch (ex) {
      console.log('Update error', ex);
    }
  }

  handleInputChange(e) {
    const settings = Object.assign({}, this.state.settings);
    settings[e.target.name] = e.target.value;
    this.setState({ settings });
  }

  renderSettingsForm() {
    const settings = [];
    for (const [settingKey, setting] of _.pairs(this.state.settings)) {
      switch (settingKey) {
        // Don't use the following settings
        case 'createdAt':
        case 'updatedAt':
        case 'uuid':
        case 'id':
        case 'model':
        case 'custom':
          break;
        case 'endpoint':
          if (String(setting) === 'false') {
            break;
          }
        default:
          settings.push(this.renderSettingInput(settingKey, setting));
      }
    }
    settings.push(<input key="submit" type="submit" value="Update!"/>);
    return (
      <form onSubmit={this.updateBotSettings}>
        {settings}
      </form>
    );
  }

  renderSettingInput(settingKey, setting) {
    // Set undefined and null to an empty string
    const settingValue = setting == undefined ? '' : setting;

    return (
      <div key={settingKey} className="row">
        <div key={`${settingKey}label`} className="settings-label col-md-4">{settingKey}</div>
        <div className="col-md-4">
          <input onChange={this.handleInputChange} key={`${settingKey}input`} type="textarea" name={settingKey} value={settingValue}/>
        </div>
        <div className="current-value col-md-4">{this.props.bot.settings[settingKey]}</div>
      </div>
    );
  }

  deleteBot() {
    request.delete(`/v1/bots/${this.props.bot.settings.uuid}`)
    .end();
  }

  render() {
    return (
      <div id="settings">
        <h3>Settings</h3>
        {this.renderSettingsForm()}
        <Button bsStyle="danger" onClick={this.deleteBot}>Delete Bot</Button>
      </div>
    );
  }
}
