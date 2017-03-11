import React from 'react';
import request from 'superagent';

export default class CamFeed extends React.Component {
  constructor(props) {
    super(props);
    //get LAN ip
    this.ip = window.location.hostname;
    this.state = { 
                    input:"http://"+this.ip+":8080/?action=stream", 
                    camUrl: "http://"+this.ip+":8080/?action=stream",
                    brightness: 50,
                    contrast: 5,
                    saturation: 100,
                    sharpness: 25,
                    pan: 0,
                    panBound: 25000,
                    tilt: 0,
                    zoom: 0
                 };

    //this.getSetCam = this.getSetCam.bind(this);
    //this.getSetCam();
    this.updateUrl = this.updateUrl.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.controlCam = this.controlCam.bind(this);
    this.zoomCam = this.zoomCam.bind(this);
  }

  //Cross Site scripting doesn't allow this stuff. This may need a micro service to relay
  getSetCam(){
    request.get("http://"+this.ip+":8080/input_0.json", function(err, res){
        console.log(res);
        if (!err) {
            var dict = {};
            res["controls"].forEach(
                function(result){
                    dict[result["name"].split(" ")[0].replace(',','').toLowerCase()] = result["value"];
                    }
            );
            this.setState(prevState => (dict));
        } 
    });
  }

  controlCam(e) {
    var dict = {};
    dict[e.target.name] = e.target.value;
    this.setState(prevState => (dict));
    var url = "http://" + this.ip + ":8080/?action=command&dest=0&plugin=0&id=" + e.target.id + "&group=1&value=" + this.state[e.target.name];
    request.get(url, function(err, res) {if (err) console.log(err)});
  }

  zoomCam(e) {
    var panBound = 25000;
    var tiltBound = 0;
    if (e.target.value !== 0) {
        panBound = 3600 * e.target.value + 31000;    
        tiltBound = 6300 * e.target.value;
    }
    console.log(panBound);
    console.log(tiltBound);
    var dict = {};
    dict['panBound'] = panBound;
    dict['tiltBound'] = tiltBound;
    this.setState(prevState => (dict));
    this.controlCam(e);
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

            <div>
                <form>
                    <label for="brightness">Brightness</label>
                    <input type="range" min="30" max="255" name="brightness" id="9963776" onChange={this.controlCam} value={this.state.brightness} />
                    
                    <label for="contrast">Contrast</label>
                    <input type="range" min="0" max="10" name="contrast" id="9963777" onChange={this.controlCam} value={this.state.contrast} />

                    <label for="saturation">Saturation</label>
                    <input type="range" min="0" max="200" name="saturation" id="9963778" onChange={this.controlCam} value={this.state.saturation} />


                    <label for="sharpness">Sharpness</label>
                    <input type="range" min="0" max="50" name="sharpness" id="9963803" onChange={this.controlCam} value={this.state.sharpness} />


                    <label for="pan">Pan</label>
                    <input type="range" min={-this.state.panBound} max={this.state.panBound} name="pan" id="10094856" onChange={this.controlCam} value={this.state.pan} />

                    <label for="tilt">Tilt</label>   
                    <input type="range" min={-this.state.tiltBound} max={this.state.tiltBound} name="tilt" id="10094857" onChange={this.controlCam} value={this.state.tilt} />

                    <label for="zoom">Zoom</label>
                    <input type="range" min="0" max="10" name="zoom" id="10094861" onChange={this.zoomCam} value={this.state.zoom} />
                </form>
            </div>

        </div>
     </div>
    );
  }
  
}
