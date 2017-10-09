import React from 'react';

import HoverAndClick from './HoverAndClick';
import { metaStates as botMetaStates } from '../botFsmDefinitions';

export default class Temp extends React.Component {
  constructor(props) {
    super(props);

    this.setNozzleTemp = this.setNozzleTemp.bind(this);
    this.setBedTemp = this.setBedTemp.bind(this);
    this.processGcode = this.processGcode.bind(this);
  }

  setNozzleTemp(event) {
    event.preventDefault();

    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      const commandObject = {
        botUuid: this.props.endpoint,
        command: 'processGcode',
        gcode: `M104 S${event.target.setpoint.value}`,
      };
      this.nozzleTempInput.value = '';

      this.props.client.emit('command', commandObject);
    }
  }

  setBedTemp(event) {
    event.preventDefault();

    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      const commandObject = {
        botUuid: this.props.endpoint,
        command: 'processGcode',
        gcode: `M140 S${event.target.setpoint.value}`,
      };

      this.bedTempInput.value = '';

      this.props.client.emit('command', commandObject);
    }
  }

  processGcode(gcode) {
    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'processGcode',
      gcode,
    };

    this.props.client.emit('command', commandObject);
  }

  renderNozzleOnOff() {
    const editable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    const t0 =
      this.props.bot.status.sensors.t0 === undefined
        ? { temperature: '?', setpoint: '?' }
        : this.props.bot.status.sensors.t0;

    if (Number(t0.setpoint) === 0) {
      return (
        <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
          <button
            disabled={!editable}
            onClick={() => {
              this.processGcode(`M104 S${this.props.bot.settings.tempE}`);
            }}
          >
            Turn On ({this.props.bot.settings.tempE}&#x2103;)
          </button>
        </HoverAndClick>
      );
    } else if (Number(t0.setpoint) > 0 || Number(t0.setpoint < 0)) {
      return (
        <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
          <button
            disabled={!editable}
            onClick={() => {
              this.processGcode('M104 S0');
            }}
          >
            Turn Off (0&#x2103;)
          </button>
        </HoverAndClick>
      );
    }
    return (
      <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
        <button disabled>On/Off</button>
      </HoverAndClick>
    );
  }

  renderBedOnOff() {
    const editable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    const b0 =
      this.props.bot.status.sensors.b0 === undefined
        ? { temperature: '?', setpoint: '?' }
        : this.props.bot.status.sensors.b0;

    if (Number(b0.setpoint) === 0) {
      return (
        <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
          <button
            disabled={!editable}
            onClick={() => {
              this.processGcode(`M140 S${this.props.bot.settings.tempB}`);
            }}
          >
            Turn On ({this.props.bot.settings.tempB}&#x2103;)
          </button>
        </HoverAndClick>
      );
    } else if (Number(b0.setpoint) > 0 || Number(b0.setpoint < 0)) {
      return (
        <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
          <button
            disabled={!editable}
            onClick={() => {
              this.processGcode('M140 S0');
            }}
          >
            Turn Off (0&#x2103;)
          </button>
        </HoverAndClick>
      );
    }
    return (
      <HoverAndClick color={{ h: this.props.appColor, s: editable ? 40 : 5, l: 40 }}>
        <button disabled>On/Off</button>
      </HoverAndClick>
    );
  }

  // Return true if setpoint greater than 0
  isHot(sensor) {
    return Number(sensor.setpoint) > 0;
  }

  render() {
    const editable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    const t0Disabled =
      this.props.bot.status.sensors.t0 === undefined ||
      Number.isNaN(Number(this.props.bot.status.sensors.t0.setpoint));
    const b0Disabled =
      this.props.bot.status.sensors.b0 === undefined ||
      Number.isNaN(Number(this.props.bot.status.sensors.b0.setpoint));

    const t0 = t0Disabled ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;
    const b0 = b0Disabled ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.b0;
    return (
      <div>
        <h3>TEMPERATURE CONTROL</h3>
        <div className="row temperature">
          <div className="col-xs-3">
            <p className="temp-title">
              <span style={{ fontSize: '20px', color: `hsl(0, ${this.isHot(t0) ? 60 : 5}%, 40%)` }}>
                &#x25cf;
              </span>
              Extruder
            </p>
          </div>
          <div className="col-xs-2">
            <form onSubmit={this.setNozzleTemp}>
              <div className="row">
                <input
                  type="text"
                  ref={(nozzleTempInput) => {
                    this.nozzleTempInput = nozzleTempInput;
                  }}
                  placeholder="X°C"
                  name="setpoint"
                  className=""
                  disabled={!editable || t0Disabled}
                />
                <input
                  type="hidden"
                  value=""
                  className="col-sm-1"
                  disabled={!editable || t0Disabled}
                />
              </div>
            </form>
          </div>
          <div className="col-xs-3 no-padding-right">
            <p className="temp-fraction">
              {t0.temperature} / {t0.setpoint}°C
            </p>
          </div>
          <div className="col-xs-4 no-padding-left">{this.renderNozzleOnOff()}</div>
        </div>
        <div className="row temperature">
          <div className="col-xs-3">
            <p className="temp-title">
              <span style={{ fontSize: '20px', color: `hsl(0, ${this.isHot(b0) ? 60 : 5}%, 40%)` }}>
                &#x25cf;
              </span>
              Bed
            </p>
          </div>
          <div className="col-xs-2">
            <form onSubmit={this.setBedTemp}>
              <div className="row">
                <input
                  type="text"
                  ref={(bedTempInput) => {
                    this.bedTempInput = bedTempInput;
                  }}
                  placeholder="X°C"
                  name="setpoint"
                  className=""
                  disabled={!editable || b0Disabled}
                />
                <input
                  type="hidden"
                  value=""
                  className="col-sm-1 fa fa-repeat"
                  disabled={!editable || b0Disabled}
                />
              </div>
            </form>
          </div>
          <div className="col-xs-3 no-padding-right">
            <p className="temp-fraction">
              {b0.temperature} / {b0.setpoint} °C
            </p>
          </div>
          <div className="col-xs-4 no-padding-left">{this.renderBedOnOff()}</div>
        </div>
      </div>
    );
  }
}
