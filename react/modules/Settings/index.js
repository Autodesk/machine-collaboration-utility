/* global document, confirm, location, document, prompt */
import React from 'react';
import request from 'superagent';
import autoBind from 'react-autobind';
import Button from 'react-bootstrap/lib/Button';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showRestartIcon: false,
    };

    autoBind(this);
  }

  downloadLogs() {
    request.get('/download-logs').end();
  }

  updateHostname() {
    if (!this.props.appSettings || !this.props.appSettings.hostname) {
      return;
    }

    const hostname = prompt('Update hostname', this.props.appSettings.hostname);
    if (hostname == null || hostname === '') {
      return;
    }

    request.post('/hostname')
    .send({ hostname })
    .set('Accept', 'application/json')
    .end();
  }

  resetMCU() {
    const reset = confirm('Are you sure you want to reset MCU?');
    if (reset) {
      request.post('/restart').end();

      this.setState({
        showRestartIcon: true,
      });

      setTimeout(() => {
        document.location.href = '/';
      }, 10000);
    }
  }

  render() {
    return (
      <div>
        <h1>Settings</h1>
        {this.state.showRestartIcon ? <div><i className="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br />Restarting</div> : null}
        <a href="/download-logs"><Button>Download Logs</Button></a>
        <br />
        <br />
        <Button onClick={this.updateHostname}>Update Hostname</Button>
        <br />
        <br />
        <Button bsStyle="danger" onClick={this.resetMCU}>Reset MCU</Button>
      </div>
    );
  }
}
