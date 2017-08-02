import React from 'react';
import request from 'superagent';

import { metaStates as botMetaStates } from '../botFsmDefinitions';
import HoverAndClick from './HoverAndClick';

export default class SendGcode extends React.Component {
  constructor(props) {
    super(props);

    this.processGcode = this.processGcode.bind(this);
  }

  processGcode(event) {
    event.preventDefault();
    const gcode = event.target.gcode.value;

    request.post(this.props.endpoint)
    .send({ command: 'processGcode' })
    .send({ gcode })
    .set('Accept', 'application/json')
    .end(() => {
      this.gcodeInput.value = '';
    });
  }

  render() {
    const gcodeable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';

    return (
      <div className="send-gcode">
        <form onSubmit={this.processGcode}>
          <div className="row">
            <div className="col-sm-7 no-padding-right">
              <input disabled={!gcodeable} ref={(gcodeInput) => { this.gcodeInput = gcodeInput; }} placeholder="type gcode here" type="text" name="gcode" />
            </div>
            <div className="col-sm-5">
               <HoverAndClick allowDefault disabled={!gcodeable} color={{ h: this.props.appColor, s: gcodeable ? 40 : 5, l: 40 }} >
                <input disabled={!gcodeable} type="submit" value="SEND GCODE" />
               </HoverAndClick>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
