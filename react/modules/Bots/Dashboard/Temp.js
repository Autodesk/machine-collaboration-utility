import React from 'react';
import request from 'superagent';

export default class Temp extends React.Component {
  constructor(props) {
    super(props);

    this.setTemp = this.setTemp.bind(this);
    this.processGcode = this.processGcode.bind(this);
  }

  setTemp(event) {
    event.preventDefault();

    const endpoint = `/v1/bots/${this.props.bot.settings.uuid}`;
    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      request.post(endpoint)
      .send({ command: `processGcode` })
      .send({ gcode: `M104 S${event.target.setpoint.value}` })
      .set('Accept', 'application/json')
      .end();
    }
  }

  processGcode(gcode) {
    const endpoint = `/v1/bots/${this.props.bot.settings.uuid}`;

    request.post(endpoint)
    .send({ command: `processGcode` })
    .send({ gcode })
    .set('Accept', 'application/json')
    .end();
  }

  renderOnOff() {
    const t0 = this.props.bot.status.sensors.t0 === undefined ?
      { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;

    if (Number(t0.setpoint) === 0) {
      return <button onClick={() => { this.processGcode(`M104 S${this.props.bot.settings.tempE}`) } }>Turn On ({this.props.bot.settings.tempE}&#x2103;)</button>;
    } else if (Number(t0.setpoint) > 0 || Number(t0.setpoint < 0)) {
      return <button onClick={() => { this.processGcode(`M104 S0`) } }>Turn Off (0&#x2103;)</button>;
    }
    return <button disabled>On/Off</button>;
  }

  render() {
    const t0 = this.props.bot.status.sensors.t0 === undefined ?
      { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;
    return (
      <div className="row">
        <h3>TEMPERATURE CONTROL</h3>
        <div className="col-sm-3">
          <p>&#x25EF; Extruder</p>
        </div>
        <div className="col-sm-3">
          <form onSubmit={this.setTemp}>
            <div className="row">
              <input type="text" name="setpoint" className="col-sm-5"/>
              <input type="submit" value="*" className="col-sm-1"/>
            </div>
          </form>
        </div>
        <div className="col-sm-3">
          <p>{t0.temperature} / {t0.setpoint}</p>
        </div>
        <div className="col-sm-3">
          {this.renderOnOff()}
        </div>
      </div>
    );
  }
}
