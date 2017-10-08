import React from 'react';
import moment from 'moment';

class Reply extends React.Component {
  render() {
    const timestamp = new moment(this.props.reply.time);
    return (
      <div>
        <p>
          <span
            className={this.props.reply.sent ? 'terminal__message--tx' : 'terminal__message--rx'}
          >
            {this.props.reply.sent ? 'TX' : 'RX'}
          </span>: <span className="">{timestamp.format('HH:mm:ss')}</span>:{' '}
          <span className="terminal__message--content">{this.props.reply.command}</span>
        </p>
      </div>
    );
  }
}

export default Reply;
