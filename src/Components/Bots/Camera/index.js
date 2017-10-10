import React from 'react';

export default class Camera extends React.Component {
  render() {
    let cameraEndpoint = `${window.location.href.split('/#')[0]}8090?action=stream`;
    if (this.props.bot.settings.model === 'Remote') {
      cameraEndpoint = `${this.props.bot.settings.endpoint.split('/v1')[0]}:8090?action=stream`;
      // TODO add handling if remote mcu hosted at port other than 80
    }
    return (
      <div style={{ width: '100%' }}>{this.props.open ? <img src={cameraEndpoint} /> : null}</div>
    );
  }
}
