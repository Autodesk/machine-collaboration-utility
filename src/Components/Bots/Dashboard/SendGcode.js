import React from 'react';
import autobind from 'react-autobind';

import HoverAndClick from './HoverAndClick';
import { metaStates as botMetaStates } from '../botFsmDefinitions';

export default class SendGcode extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gcodeInput: '',
    };

    autobind(this);
  }

  processGcode(event) {
    event.preventDefault();
    const gcode = String(event.target.gcode.value);

    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'processGcode',
      gcode,
    };

    if (this.props.forceJog === true) {
      commandObject.force = true;
    }

    this.props.client.emit('command', commandObject);

    this.setState({ gcodeInput: '' });
  }

  updateGcodeInput(e) {
    this.setState({ gcodeInput: e.target.value.toUpperCase() });
  }

  render() {
    const commandable =
      this.state.gcodeInput.length > 0 &&
      (this.props.bot.state === 'idle' ||
        this.props.bot.state === 'paused' ||
        (this.props.forceJog === true && botMetaStates.connected.includes(this.props.bot.state)));

    return (
      <div className="send-gcode">
        <form onSubmit={this.processGcode}>
          <div className="row">
            <div className="col-sm-7 no-padding-right">
              <input
                name="gcode"
                className="text-input"
                value={this.state.gcodeInput}
                default=""
                placeholder="Enter Gcode Here"
                onChange={this.updateGcodeInput}
                type="text"
              />
            </div>
            <div className="col-sm-5">
              <HoverAndClick
                allowDefault
                disabled={!commandable}
                color={{ h: 120, s: commandable ? 40 : 5, l: 40 }}
              >
                <input disabled={!commandable} type="submit" value="SEND GCODE" />
              </HoverAndClick>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
