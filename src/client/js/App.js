import React from 'react';
import Header from './modules/Header';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bots: {
        
      },
      jobs: {
        
      },
      files: {
        
      },
    }
  }
  render() {
    return (
      <div>
        <Header/>
        {this.props.children}
      </div>
    );
  }
}
