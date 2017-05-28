import React from 'react';
import request from 'superagent';

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
    .end();
  }

  render() {
    return (
      <div className="send-gcode">
        <form onSubmit={this.processGcode}>
          <div className="row">
            <div className="col-sm-7 no-padding-right">
              <input placeholder="type gcode here" type="text" name="gcode"/>
            </div>
            <div className="col-sm-5">
              <input type="submit" value="SEND GCODE" />
            </div>
          </div>
        </form>
      </div>
    );
  }
}
