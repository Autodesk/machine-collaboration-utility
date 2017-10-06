import React from 'react';

const Reply = (props) => {
  return <p>{props.reply.time}: {props.reply.reply}</p>
}

export default class Terminal extends React.Component {
  constructor(props) {
    super(props);

    this.maxReplies = 32;

    this.state = {
      listening: false,
      replies: [],
    };
  }

  socketConstructor() {
    this.eventListener = this.props.client.on('botReply', (reply) => {
      let newReplies = Object.assign([], this.state.replies);
      if (newReplies.length > this.maxReplies) {
        newReplies = newReplies.slice(1);
      }
      newReplies.push({ reply, time: Date.now() });

      this.setState({ replies: newReplies });
    });

    this.setState({ listening: true });
  }

  socketDeconstructor() {
    this.eventListener = null;
    this.setState({ listening: false });
  }

  componentWillReceiveProps(props) {
    if (props.open && !this.state.listening) {
      this.socketConstructor();
    } else if (!props.open && this.state.listening) {
      this.socketDeconstructor();
    }
  }

  render() {
    return (
      <div>
        <h1>Terminal</h1>
        {this.state.replies.map(reply => <Reply reply={reply} />)}
      </div>
    );
  }
}
