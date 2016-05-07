import React from 'react'
import NavLink from './NavLink'

export default React.createClass({
  render() {
    return <div>
      <div className="header">
        <div className="container">
          <div className="col-xs-3"><NavLink to="/">
            <div className="logo">
              <img src="images/logo.svg"/>
            </div>
            <h2 className="hidden-xs">
              <span className="bold">Hydra</span><span>Print</span>
            </h2>
          </NavLink></div>
          <div className="col-xs-9 float-right">
            <ul>
              <li><NavLink to="/files"><span className="hidden-xs">Files</span><span className="hidden-sm hidden-md hidden-lg"><i className="fa fa-file"></i></span></NavLink></li>
            </ul>
          </div>
        </div>
      </div>
    </div>;
  },
});
