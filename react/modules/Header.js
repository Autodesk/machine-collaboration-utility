import React from 'react';
import NavLink from './NavLink';

export default class Header extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="header">
        <div>
          <div className="col-xs-8"><NavLink to="/">
            <div className="logo">
              <img src="images/logo.svg"/>
            </div>
            <h2 className="hidden-xs">
              <span className="bold">Machine Collaboration Utility</span>
            </h2>
          </NavLink></div>
          <div className="col-xs-4 float-right">
            <ul>
              <li>
                <NavLink to="/">
                  <span className="hidden-xs">Bots</span>
                  <span className="hidden-sm hidden-md hidden-lg">
                    <i className="fa fa-cog"></i>
                  </span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/files">
                  <span className="hidden-xs">Files</span>
                  <span className="hidden-sm hidden-md hidden-lg">
                    <i className="fa fa-file"></i>
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
