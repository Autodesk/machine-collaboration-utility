import React from 'react';
import Header from './modules/Header';
import Dropzone from 'react-dropzone';
import request from 'superagent';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hydraPrint: props.hydraPrint
    }
  }

  onDrop(files) {
    const req = request.post('/v1/files');
    req.set('conductor', 'true');
    files.forEach((file) => {
      req.attach(file.name, file);
    });
    req.end(() => {
      // Called after the file is uploaded
    });
  }

  render() {
    const dropzoneStyle = {
      width: "100%",
      height: "100%",
    };
    const childrenComponents = React.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject hydraPrint app objects
      return React.cloneElement(child, this.state.hydraPrint);
    });
    return (
      <div>
        <Dropzone
          style={dropzoneStyle}
          onDrop={this.onDrop}
        >
          <Header/>
          {childrenComponents}
        </Dropzone>
      </div>
    );
  }
}
