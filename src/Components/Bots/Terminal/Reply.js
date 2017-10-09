import React from 'react';
import moment from 'moment';

const Line = props => <div>{props.line}</div>;

class Reply extends React.Component {
  breakUpLines(command) {
    return command.split('\n').map((line, i) => <Line key={i} line={line} />);
  }

  render() {
    const timestamp = new moment(this.props.reply.time);
    return (
      <div>
        <div>
          <span
            className={this.props.reply.sent ? 'terminal__message--tx' : 'terminal__message--rx'}
          >
            {this.props.reply.sent ? 'TX' : 'RX'}
          </span>: <span className="">{timestamp.format('HH:mm:ss')}</span>:{' '}
          <span className="terminal__message--content">
            {this.breakUpLines(this.props.reply.command)}
          </span>
        </div>
      </div>
    );
  }
}

export default Reply;
