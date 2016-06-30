import React from 'react';

export default class Bots extends React.Component {
  constructor(props) {
    super(props);
  }
  createBot(bot) {
    return <div>{bot.settings.name}</div>;
  }
  render() {
    const bots = Object.entries(this.props.bots).map(([botKey, bot]) => {
      return this.createBot(bot);
    });
    return <div>{bots}</div>;
  }
}
