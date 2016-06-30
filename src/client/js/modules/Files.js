import React from 'react';

export default class Files extends React.Component {
  constructor(props) {
    super(props);
  }
  createFile(file) {
    return (<div>
      <div>File UUID: {file.uuid}</div>
      <div>File name: {file.name}</div>
      <br></br>
    </div>);
  }
  render() {
    const files = Object.entries(this.props.files).map(([fileKey, file]) => {
      return this.createFile(file);
    });
    return <div>{files}</div>;
  }
}
