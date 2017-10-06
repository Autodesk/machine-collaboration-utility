import React from 'react';
import moment from 'moment';

class Reply extends React.Component {
  render() {
    const timestamp = new moment(this.props.reply.time);
    return <div>
      <p>{this.props.reply.sent ? 'TX' : 'RX'}: {timestamp.format('HH:mm:ss')}: {this.props.reply.command}</p>
      </div>
  }
}

export default Reply;
