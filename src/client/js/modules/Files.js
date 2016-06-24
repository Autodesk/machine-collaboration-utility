import React from 'react';

export default class Files extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hydraPrint: props.params.hydraPrint
    }
  }
  createFile(file) {
    return <div>{file.uuid}</div>
  }
  render() {
    const files = Object.entries(this.state.hydraPrint.files).map(([fileKey, file]) => {
      return this.createFile(file);
    });
    return <div>{files}</div>;
  }
}
