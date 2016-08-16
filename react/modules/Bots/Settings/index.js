import React from 'react';
import request from 'superagent';
import _ from 'underscore';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.updateBotSettings = this.updateBotSettings.bind(this);
  }

  updateBotSettings(event) {
    event.preventDefault();
    let update = request.put(`/v1/bots/${this.props.bot.settings.uuid}`)
    for (const [settingKey, setting] of _.pairs(this.props.bot.settings)) {
      const paramJson = {};
      if (event.target[settingKey] !== undefined) {
        paramJson[settingKey] = event.target[settingKey].value;
        update = update.send(paramJson);
      }
    }
    update = update.set('Accept', 'application/json');
    try {
      update.end();
    } catch (ex) {
      console.log(`Update error`, ex);
    }
  }

  renderSettingsForm() {
    const settings = [];
    for (const [settingKey, setting] of _.pairs(this.props.bot.settings)) {
      switch (settingKey) {
        case `createdAt`:
        case `updatedAt`:
        case `uuid`:
        case `id`:
        case `model`:
          break;
        case `endpoint`:
          if (String(setting) === `false`) {
            break;
          }
        default:
          settings.push(this.renderSettingInput(settingKey, setting));
      }
    }
    settings.push(<input type="submit" value="Update!"/>);
    return (
      <form onSubmit={this.updateBotSettings}>
        {settings}
      </form>
    );
  }

  renderSettingInput(settingKey, setting) {
    return (
      <div key={settingKey}>
        <label key={`${settingKey}label`} htmlFor={settingKey}>{settingKey}</label>
        <input key={`${settingKey}input`} type="textarea" name={settingKey} defaultValue={setting}/>
      </div>
    );
  }

  render() {
    const settingsForm = this.renderSettingsForm();
    return (
      <div>
        <h3>Settings</h3>
        {settingsForm}
      </div>
    );
  }
}
