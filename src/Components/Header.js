import React from 'react';
import { NavLink } from 'react-router-dom';

export default () => (
  <div className="header">
    <div>
      <div className="col-xs-4 col-sm-7 no-padding-right">
        <NavLink to="/">
          <div className="logo">
            <img alt="MCU Logo" src="images/logo.svg" />
          </div>
          <h2 className="hidden-xs">
            <span className="bold">Machine Collaboration Utility</span>
          </h2>
        </NavLink>
      </div>
      <div className="col-xs-8 col-sm-5 float-right no-padding-left">
        <ul>
          <li>
            <NavLink to="/">
              <span className="hidden-xs">Bots</span>
              <span className="hidden-sm hidden-md hidden-lg">
                <i className="fa fa-tachometer" />
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/files">
              <span className="hidden-xs">Files</span>
              <span className="hidden-sm hidden-md hidden-lg">
                <i className="fa fa-files-o" />
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings">
              <span className="hidden-xs">Settings</span>
              <span className="hidden-sm hidden-md hidden-lg">
                <i className="fa fa-cogs" />
              </span>
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
);
