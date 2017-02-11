import React from 'react';
import request from 'superagent';

export default class CamFeed extends React.Component {
  constructor(props) {
    super(props);
    this.state = {input:"http://0.0.0.0:8080/?action=stream", camUrl: "http://0.0.0.0:8080/?action=stream"};
    this.updateUrl = this.updateUrl.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  updateUrl() {
    this.setState(prevState => ({
        camUrl: this.state.input
    }));
  }

  handleInputChange(e) {
    if (e.target.value !== null) {
        this.setState(prevState => ({
            input: e.target.value    
        }));
    }
    e.persist()
  }

  render() {
    return (
      <div id="camfeed">
        <div style={{width: '100%', textAlign: 'center'}}><img src={this.state.camUrl} alt="CamFeed" /></div>
        <div style={{width: '100%'}}>
            <b>Camera URL:</b>
            <br />
            <input type="text" name="camUrlInput" id="camUrlInput" placeholder="Camera URL" value={this.state.input} onChange={this.handleInputChange} />
            <a href="#" onClick={this.updateUrl}>Update</a>
        </div>
     </div>
    );
  }
  
}
