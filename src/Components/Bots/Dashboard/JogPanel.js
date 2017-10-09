import React from 'react';
import path from 'path';

import { metaStates as botMetaStates } from '../botFsmDefinitions';

class Polygon extends React.Component {
  constructor(props) {
    super(props);

    this.fadeTime = 150;

    const borderColor = Object.assign({}, props.fillColor);
    borderColor.l -= 10;

    this.state = {
      color: props.fillColor,
      borderColor,
    };

    this.handleClick = this.handleClick.bind(this);
    this.startHover = this.startHover.bind(this);
    this.leaveHover = this.leaveHover.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const borderColor = Object.assign({}, nextProps.fillColor);
    borderColor.l -= 10;

    this.setState({ color: nextProps.fillColor, borderColor });
  }

  hslToString(hsl) {
    return `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
  }

  handleClick(event) {
    event.preventDefault();

    const commandObject = {
      botUuid: this.props.endpoint,
      command: 'jog',
      amount: this.props.amount,
      axis: this.props.axis,
    };

    this.props.client.emit('command', commandObject);
    // On mobile, should reset color after click
    // this.setState({ color: this.buttonColor });

    setTimeout(() => {
      const borderColor = Object.assign({}, this.props.fillColor);
      borderColor.l -= 10;

      this.setState({ borderColor });
    }, this.fadeTime);

    const borderColor = Object.assign({}, this.props.fillColor);
    borderColor.l += 80;

    this.setState({ borderColor });
  }

  startHover() {
    const color = Object.assign({}, this.props.fillColor);
    color.l += 10;
    this.setState({ color });
  }

  leaveHover() {
    this.setState({ color: this.props.fillColor });
  }

  render() {
    let x = 0;
    let y = 0;
    this.props.points.split(' ').map((xy) => {
      const xyArray = xy.split(',');
      x += Number(xyArray[0]);
      y += Number(xyArray[1]);
    });

    const text =
      this.props.axis === 'x' ? null : (
        <text fill="white" x={x / 4 - 15} y={y / 4 + 5}>
          {Number(this.props.amount) > 0 ? '+' : ''}
          {this.props.amount}
        </text>
      );
    const fill = this.hslToString(this.state.color);
    const border = this.hslToString(this.state.borderColor);

    return (
      <g
        className={`${this.props.jogable ? 'jog' : ''} no-select`}
        onClick={this.props.jogable ? this.handleClick : null}
        onMouseOut={this.props.jogable ? this.leaveHover : null}
        onMouseOver={this.props.jogable ? this.startHover : null}
      >
        <polygon
          style={{
            fill,
            transition: `${this.fadeTime}ms`,
            transitionTimingFunction: 'ease',
            stroke: border,
            strokeWidth: '3px',
          }}
          points={this.props.points}
        />
        {text}
      </g>
    );
  }
}

export default class JogPanel extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const jogable = this.props.bot.state === 'idle' || this.props.bot.state === 'paused';
    const botSaturation = jogable ? 40 : 5;

    const primary = { h: this.props.appColor, s: botSaturation, l: 40 };
    const primaryMedium = { h: this.props.appColor, s: botSaturation, l: 45 };
    const primaryLight = { h: this.props.appColor, s: botSaturation, l: 50 };
    const primarySuperLight = { h: this.props.appColor, s: botSaturation, l: 55 };
    const white = '#ffffff';

    return (
      <div
        style={{
          maxWidth: '450px',
          height: 'auto',
          st2: { fill: '#76AEA6' },
          st4: { fill: '#747476' },
          st5: { fill: '#797C7D' },
          st6: { fill: '#9FA1A4' },
          st7: { fill: '#C0C0C2' },
          st8: { fill: white },
        }}
      >
        <h3>JOG PANEL</h3>
        <svg version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 536 360">
          <g style={{ disabled: true }}>
            <g>
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="329.5,27.1 38.9,27.1 66.9,55.1 301.5,55.1"
                axis={'y'}
                amount={100}
              />
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="61.9,294.7 61.9,60 34,32.1 34,322.6"
                axis={'x'}
                amount={-100}
              />
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="334.4,32.1 306.5,60 306.5,294.7 334.4,322.6"
                axis={'x'}
                amount={100}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="294.5,62.1 73.8,62.1 101.8,90 266.6,90"
                axis={'y'}
                amount={10}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="96.9,259.8 96.9,95 68.9,67 68.9,287.7"
                axis={'x'}
                amount={-10}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="299.5,67 271.5,95 271.5,259.8 299.5,287.7"
                axis={'x'}
                amount={10}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="259.6,97 108.8,97 136.7,125 231.7,125"
                axis={'y'}
                amount={1}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="131.8,224.8 131.8,129.9 103.8,102 103.8,252.8"
                axis={'x'}
                amount={-1}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="264.5,102 236.6,129.9 236.6,224.8 264.5,252.8"
                axis={'x'}
                amount={1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="224.7,131.9 143.7,131.9 171.7,159.9 196.7,159.9"
                axis={'y'}
                amount={0.1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="166.7,189.9 166.7,164.8 138.8,136.9 138.8,217.8"
                axis={'x'}
                amount={-0.1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="229.6,136.9 201.7,164.8 201.7,189.9 229.6,217.8"
                axis={'x'}
                amount={0.1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="196.7,194.8 171.7,194.8 143.7,222.8 224.7,222.8"
                axis={'y'}
                amount={-0.1}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="231.7,229.8 136.7,229.8 108.8,257.7 259.6,257.7"
                axis={'y'}
                amount={-1}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="266.6,264.7 101.8,264.7 73.8,292.7 294.5,292.7"
                axis={'y'}
                amount={-10}
              />
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="301.5,299.6 66.9,299.6 38.9,327.6 329.5,327.6"
                axis={'y'}
                amount={-100}
              />

              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,301.1 380.1,329.1 442.7,329.1 442.7,301.1"
                axis={'z'}
                amount={-100}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,266 380.1,294 442.7,294 442.7,266"
                axis={'z'}
                amount={-10}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,231 380.1,259 442.7,259 442.7,231"
                axis={'z'}
                amount={-1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,195.9 380.1,223.9 442.7,223.9 442.7,195.9"
                axis={'z'}
                amount={-0.1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,132.9 380.1,160.9 442.7,160.9 442.7,132.9"
                axis={'z'}
                amount={0.1}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,97.8 380.1,125.8 442.7,125.8 442.7,97.8"
                axis={'z'}
                amount={1}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,62.8 380.1,90.8 442.7,90.8 442.7,62.8"
                axis={'z'}
                amount={10}
              />
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="380.1,27.8 380.1,55.8 442.7,55.8 442.7,27.8"
                axis={'z'}
                amount={100}
              />

              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,301.1 461.2,329.1 523.8,329.1 523.8,301.1"
                axis={'e'}
                amount={100}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,266 461.2,294 523.8,294 523.8,266"
                axis={'e'}
                amount={10}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,231 461.2,259 523.8,259 523.8,231"
                axis={'e'}
                amount={1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,195.9 461.2,223.9 523.8,223.9 523.8,195.9"
                axis={'e'}
                amount={0.1}
              />
              <Polygon
                fillColor={primarySuperLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,132.9 461.2,160.9 523.8,160.9 523.8,132.9"
                axis={'e'}
                amount={-0.1}
              />
              <Polygon
                fillColor={primaryLight}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,97.8 461.2,125.8 523.8,125.8 523.8,97.8"
                axis={'e'}
                amount={-1}
              />
              <Polygon
                fillColor={primaryMedium}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,62.8 461.2,90.8 523.8,90.8 523.8,62.8"
                axis={'e'}
                amount={-10}
              />
              <Polygon
                fillColor={primary}
                client={this.props.client}
                endpoint={this.props.endpoint}
                jogable={jogable}
                points="461.2,27.8 461.2,55.8 523.8,55.8 523.8,27.8"
                axis={'e'}
                amount={-100}
              />
            </g>
            <g>
              <path
                className="st8"
                d="M197.5,176.5l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7v1.9h-15.6v-1.9c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3s-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3s0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7v-2H192v2c0,0.3,0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7S197.7,176.7,197.5,176.5z"
              />
            </g>
            <g>
              <path
                className="st8"
                d="M184.9,190.6l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3h-1.9v-15.6h1.9c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7s-0.1-0.5-0.3-0.7l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3s-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3h2V185h-2c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3S184.7,190.8,184.9,190.6z"
              />
            </g>
            <g>
              <g>
                <path
                  className="st8"
                  d="M425,178.1l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7v1.9h-15.6v-1.9c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7v-2h15.6v2c0,0.3,0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7S425.2,178.3,425,178.1z"
                />
              </g>
              <g>
                <path
                  className="st8"
                  d="M412.3,192.1l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3h-1.9V171h1.9c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7s-0.1-0.5-0.3-0.7l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3h2v15.6h-2c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3C411.9,192.4,412.1,192.3,412.3,192.1z"
                />
              </g>
            </g>
            <g>
              <g>
                <path
                  className="st8"
                  d="M505.9,178.6l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7v1.9h-15.6v-1.9c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7v-2h15.6v2c0,0.3,0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7S506.1,178.8,505.9,178.6z"
                />
              </g>
              <g>
                <path
                  className="st8"
                  d="M493.2,192.6l3.9-3.9c0.2-0.2,0.3-0.4,0.3-0.7c0-0.3-0.1-0.5-0.3-0.7c-0.2-0.2-0.4-0.3-0.7-0.3h-1.9v-15.6h1.9c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7s-0.1-0.5-0.3-0.7l-3.9-3.9c-0.2-0.2-0.4-0.3-0.7-0.3c-0.3,0-0.5,0.1-0.7,0.3l-3.9,3.9c-0.2,0.2-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7c0.2,0.2,0.4,0.3,0.7,0.3h2V187h-2c-0.3,0-0.5,0.1-0.7,0.3c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7l3.9,3.9c0.2,0.2,0.4,0.3,0.7,0.3C492.8,192.9,493,192.8,493.2,192.6z"
                />
              </g>
            </g>
            <g>
              <path d="M169,14.4v-1.9h3.1V9.3h2.1v3.2h3.1v1.9h-3.1v3.3h-2.1v-3.3H169z" />
              <path d="M182.8,5.6h2.3l3,5.4l3-5.4h2.1l-4.1,7.3v4.8H187v-4.8L182.8,5.6z" />
            </g>
            <g>
              <path d="M6,180.8v-2h4.6v2H6z" />
              <path d="M16.4,184.1l3.9-6.2l-3.7-5.8h2.5l2.5,4.2L24,172h2.3l-3.7,5.8l3.9,6.2h-2.5l-2.7-4.6l-2.6,4.6H16.4z" />
            </g>
            <g>
              <path d="M399.2,17.6v-1.9h3.1v-3.2h2.1v3.2h3.1v1.9h-3.1v3.3h-2.1v-3.3H399.2z" />
              <path d="M413.1,20.9l6.3-10.1h-5.7v-2h9.2l-6.3,10.1h5.9v2H413.1z" />
            </g>
            <g>
              <path d="M170.4,349.9v-2h4.6v2H170.4z" />
              <path d="M180.8,341.1h2.3l3,5.4l3-5.4h2.1l-4.1,7.3v4.8h-2.1v-4.8L180.8,341.1z" />
            </g>
            <g>
              <path d="M338.3,178.8v-1.9h3.1v-3.2h2.1v3.2h3.1v1.9h-3.1v3.3h-2.1v-3.3H338.3z" />
              <path d="M352.2,182.1l3.9-6.2l-3.7-5.8h2.5l2.5,4.2l2.4-4.2h2.3l-3.7,5.8l3.9,6.2h-2.5l-2.7-4.6l-2.6,4.6H352.2z" />
            </g>
            <g>
              <path d="M402.9,345.3v-1.9h4.6v1.9H402.9z" />
              <path d="M413.4,348.4l6.3-9.7h-5.7v-1.9h9.2l-6.3,9.7h5.9v1.9H413.4z" />
            </g>
            <g>
              <path d="M464.6,347.4v-11.6h7.3v1.9h-5.3v2.8h4.8v1.9h-4.8v3.1h5.4v1.9H464.6z" />
              <path d="M473,347.4l3-4l-2.8-3.8h2.4l1.7,2.4l1.6-2.4h2.4l-2.9,3.8l3,4h-2.5l-1.9-2.7l-1.8,2.7H473z" />
              <path d="M482.2,341.4v-1.8h1.6v-2.3h2.1v2.3h2.5v1.8h-2.5v3.2c0,0.2,0,0.4,0.1,0.6c0.1,0.2,0.2,0.3,0.2,0.4c0.1,0.1,0.2,0.2,0.3,0.2c0.1,0,0.2,0.1,0.4,0.1c0.2,0,0.3,0,0.5-0.1c0.1-0.1,0.3-0.1,0.4-0.2l0.8,1.6c-0.2,0.2-0.5,0.3-0.9,0.4c-0.3,0.1-0.7,0.1-1.1,0.1c-0.4,0-0.8-0.1-1.1-0.2c-0.3-0.1-0.6-0.3-0.9-0.6c-0.3-0.3-0.5-0.5-0.6-0.9c-0.1-0.3-0.2-0.7-0.2-1.1v-3.5H482.2z" />
              <path d="M490,347.4v-7.8h2v1.2c0.2-0.3,0.5-0.7,0.9-0.9c0.4-0.3,0.8-0.4,1.4-0.4c0.2,0,0.4,0,0.6,0.1c0.3,0,0.5,0.1,0.7,0.2l-0.7,1.8c-0.1-0.1-0.3-0.1-0.4-0.1c-0.2,0-0.3,0-0.5,0c-0.5,0-0.9,0.1-1.2,0.3c-0.3,0.2-0.5,0.5-0.7,0.7v5.1H490z" />
              <path d="M496.7,344.6v-5.1h2.1v4.5c0,0.6,0.1,1,0.4,1.3c0.3,0.3,0.7,0.4,1.1,0.4c0.4,0,0.8-0.1,1.1-0.3c0.3-0.2,0.5-0.4,0.7-0.7v-5.2h2.1v7.8h-1.9v-1.1c-0.1,0.1-0.2,0.3-0.4,0.5c-0.2,0.2-0.3,0.3-0.5,0.4c-0.2,0.1-0.5,0.2-0.7,0.3c-0.3,0.1-0.6,0.1-0.9,0.1c-0.4,0-0.7-0.1-1.1-0.2c-0.3-0.1-0.7-0.3-1-0.6c-0.3-0.2-0.5-0.5-0.7-0.9C496.8,345.5,496.7,345.1,496.7,344.6z" />
              <path d="M505.6,343.5c0-0.6,0.1-1.2,0.3-1.7c0.2-0.5,0.5-0.9,0.9-1.3c0.4-0.4,0.8-0.6,1.3-0.8c0.5-0.2,1-0.3,1.5-0.3c0.6,0,1.1,0.1,1.5,0.3c0.4,0.2,0.7,0.5,0.9,0.7v-5.5h2.1v12.5h-1.9v-1c-0.2,0.3-0.5,0.6-0.9,0.8c-0.4,0.3-0.9,0.4-1.6,0.4c-0.5,0-1-0.1-1.5-0.3c-0.5-0.2-0.9-0.5-1.3-0.9c-0.4-0.4-0.7-0.8-0.9-1.3C505.7,344.6,505.6,344.1,505.6,343.5z M507.7,343.5c0,0.6,0.2,1.2,0.6,1.6c0.4,0.4,0.9,0.6,1.6,0.6c0.5,0,0.9-0.1,1.2-0.3c0.3-0.2,0.6-0.5,0.7-0.8v-2.3c-0.2-0.3-0.4-0.5-0.7-0.8s-0.7-0.3-1.2-0.3c-0.7,0-1.2,0.2-1.6,0.6C507.9,342.3,507.7,342.9,507.7,343.5z" />
              <path d="M515.7,343.5c0-0.6,0.1-1.1,0.3-1.6c0.2-0.5,0.5-0.9,0.9-1.3c0.3-0.4,0.8-0.7,1.3-0.9c0.5-0.2,1-0.3,1.6-0.3c0.6,0,1.1,0.1,1.6,0.3c0.5,0.2,1,0.5,1.3,0.8c0.4,0.3,0.7,0.8,0.9,1.3c0.2,0.5,0.3,1.1,0.3,1.7v0.3c0,0.1,0,0.2,0,0.4h-6.1c0,0.2,0.1,0.4,0.3,0.6c0.1,0.2,0.3,0.4,0.5,0.5c0.2,0.2,0.4,0.3,0.7,0.4c0.3,0.1,0.6,0.1,0.9,0.1c0.4,0,0.7-0.1,1.1-0.2s0.8-0.3,1.1-0.6l1,1.5c-0.3,0.3-0.8,0.5-1.3,0.8c-0.6,0.2-1.2,0.4-1.9,0.4c-0.6,0-1.2-0.1-1.7-0.3c-0.5-0.2-1-0.5-1.4-0.9c-0.4-0.4-0.7-0.8-0.9-1.3C515.9,344.6,515.7,344,515.7,343.5z M517.9,342.8h4.1c0-0.2-0.1-0.3-0.1-0.5c-0.1-0.2-0.2-0.4-0.4-0.5c-0.2-0.2-0.4-0.3-0.6-0.4s-0.6-0.1-0.9-0.1c-0.3,0-0.6,0-0.9,0.1c-0.2,0.1-0.4,0.2-0.6,0.4c-0.2,0.2-0.3,0.3-0.4,0.5C517.9,342.4,517.9,342.6,517.9,342.8z" />
            </g>
            <g>
              <path d="M466.1,20.7V8.6h4c0.6,0,1.1,0.1,1.6,0.3c0.5,0.2,0.9,0.4,1.3,0.8c0.3,0.3,0.6,0.7,0.8,1.2c0.2,0.5,0.3,1,0.3,1.5c0,0.9-0.2,1.7-0.7,2.3s-1.1,1.1-2,1.3l3,4.7h-2.4l-2.9-4.6h-1v4.6H466.1z M468.1,14.2h1.6c0.7,0,1.2-0.1,1.6-0.4c0.4-0.3,0.6-0.7,0.6-1.3c0-0.6-0.2-1.1-0.6-1.3c-0.4-0.3-0.9-0.4-1.6-0.4h-1.6V14.2z" />
              <path d="M475.3,16.6c0-0.6,0.1-1.2,0.3-1.7c0.2-0.5,0.5-1,0.9-1.4c0.3-0.4,0.8-0.7,1.3-0.9c0.5-0.2,1-0.3,1.6-0.3c0.6,0,1.1,0.1,1.6,0.3c0.5,0.2,1,0.5,1.3,0.9c0.4,0.4,0.7,0.8,0.9,1.3c0.2,0.5,0.3,1.1,0.3,1.7v0.3c0,0.1,0,0.2,0,0.5h-6.1c0,0.2,0.1,0.4,0.3,0.6c0.1,0.2,0.3,0.4,0.5,0.5c0.2,0.2,0.4,0.3,0.7,0.4c0.3,0.1,0.6,0.2,0.9,0.2c0.4,0,0.7-0.1,1.1-0.2c0.4-0.1,0.8-0.3,1.1-0.6l1,1.6c-0.3,0.3-0.8,0.6-1.3,0.8c-0.6,0.3-1.2,0.4-1.9,0.4c-0.6,0-1.2-0.1-1.7-0.3c-0.5-0.2-1-0.5-1.4-0.9c-0.4-0.4-0.7-0.8-0.9-1.4C475.4,17.7,475.3,17.2,475.3,16.6z M477.4,15.8h4.1c0-0.2-0.1-0.4-0.1-0.6c-0.1-0.2-0.2-0.4-0.4-0.6c-0.2-0.2-0.4-0.3-0.6-0.4c-0.3-0.1-0.6-0.2-0.9-0.2c-0.3,0-0.6,0.1-0.9,0.2c-0.2,0.1-0.4,0.2-0.6,0.4c-0.2,0.2-0.3,0.3-0.4,0.5C477.5,15.5,477.4,15.7,477.4,15.8z" />
              <path d="M484.4,14.4v-1.9h1.6v-2.4h2.1v2.4h2.5v1.9h-2.5v3.3c0,0.2,0,0.5,0.1,0.6c0.1,0.2,0.2,0.3,0.2,0.4c0.1,0.1,0.2,0.2,0.3,0.2c0.1,0,0.2,0.1,0.4,0.1c0.2,0,0.3,0,0.5-0.1c0.1-0.1,0.3-0.1,0.4-0.2l0.8,1.7c-0.2,0.2-0.5,0.3-0.9,0.4c-0.3,0.1-0.7,0.2-1.1,0.2c-0.4,0-0.8-0.1-1.1-0.2c-0.3-0.1-0.6-0.3-0.9-0.6s-0.5-0.6-0.6-0.9c-0.1-0.4-0.2-0.8-0.2-1.2v-3.6H484.4z" />
              <path d="M492.3,20.7v-8.2h2v1.2c0.2-0.4,0.5-0.7,0.9-1c0.4-0.3,0.8-0.4,1.4-0.4c0.2,0,0.4,0,0.6,0.1c0.3,0,0.5,0.1,0.7,0.2l-0.7,1.9c-0.1-0.1-0.3-0.1-0.4-0.1c-0.2,0-0.3-0.1-0.5-0.1c-0.5,0-0.9,0.1-1.2,0.4c-0.3,0.2-0.5,0.5-0.7,0.8v5.3H492.3z" />
              <path d="M498.6,18.2c0-0.4,0.1-0.8,0.3-1.1c0.2-0.3,0.4-0.6,0.7-0.9c0.3-0.2,0.6-0.4,1-0.6c0.4-0.1,0.8-0.2,1.3-0.2c0.4,0,0.8,0.1,1.2,0.2c0.4,0.1,0.8,0.3,1.1,0.4v-0.5c0-0.3-0.1-0.5-0.2-0.7s-0.3-0.3-0.4-0.4c-0.2-0.1-0.4-0.2-0.6-0.2c-0.2,0-0.4-0.1-0.6-0.1c-0.3,0-0.6,0-1.1,0.1c-0.4,0.1-0.9,0.3-1.4,0.5l-0.7-1.7c0.4-0.2,0.9-0.4,1.5-0.5c0.6-0.1,1.2-0.2,1.8-0.2c1.1,0,2,0.3,2.7,0.8c0.7,0.6,1,1.3,1,2.2v5.3h-1.9v-1c-0.3,0.4-0.6,0.6-1.1,0.9c-0.5,0.2-1,0.4-1.6,0.4c-0.4,0-0.7-0.1-1.1-0.2c-0.4-0.1-0.7-0.3-1-0.5c-0.3-0.2-0.5-0.5-0.7-0.9C498.6,19,498.6,18.6,498.6,18.2z M500.7,18.1c0,0.2,0,0.4,0.1,0.5c0.1,0.1,0.2,0.2,0.4,0.3c0.2,0.1,0.3,0.1,0.5,0.2c0.2,0,0.3,0,0.5,0c0.5,0,0.9-0.1,1.2-0.3c0.3-0.2,0.6-0.4,0.7-0.6v-0.8c-0.3-0.1-0.6-0.2-0.9-0.3c-0.3-0.1-0.6-0.1-0.9-0.1c-0.2,0-0.4,0-0.5,0.1c-0.2,0-0.4,0.1-0.5,0.2c-0.2,0.1-0.3,0.2-0.4,0.4C500.7,17.7,500.7,17.9,500.7,18.1z" />
              <path d="M507.6,16.6c0-0.6,0.1-1.2,0.3-1.7c0.2-0.5,0.5-1,0.9-1.4c0.4-0.4,0.9-0.7,1.4-0.9c0.5-0.2,1.1-0.3,1.7-0.3c0.4,0,0.8,0,1.1,0.1c0.4,0.1,0.7,0.2,0.9,0.4c0.3,0.2,0.5,0.3,0.8,0.5c0.2,0.2,0.4,0.4,0.5,0.5l-1.4,1.3c-0.2-0.2-0.5-0.4-0.8-0.6c-0.3-0.2-0.7-0.3-1.1-0.3c-0.3,0-0.7,0.1-1,0.2c-0.3,0.1-0.5,0.3-0.7,0.5c-0.2,0.2-0.3,0.5-0.5,0.7c-0.1,0.3-0.2,0.6-0.2,0.9c0,0.3,0.1,0.6,0.2,0.9c0.1,0.3,0.3,0.5,0.5,0.7c0.2,0.2,0.4,0.4,0.7,0.5c0.3,0.1,0.6,0.2,1,0.2c0.5,0,0.9-0.1,1.2-0.3c0.3-0.2,0.6-0.4,0.8-0.7l1.4,1.4c-0.1,0.2-0.3,0.4-0.5,0.5c-0.2,0.2-0.4,0.3-0.8,0.5c-0.3,0.1-0.6,0.3-0.9,0.4c-0.3,0.1-0.7,0.2-1.1,0.2c-0.6,0-1.2-0.1-1.7-0.3c-0.5-0.2-1-0.5-1.4-0.9c-0.4-0.4-0.7-0.9-0.9-1.4C507.7,17.8,507.6,17.2,507.6,16.6z" />
              <path d="M516.1,14.4v-1.9h1.6v-2.4h2.1v2.4h2.5v1.9h-2.5v3.3c0,0.2,0,0.5,0.1,0.6c0.1,0.2,0.2,0.3,0.2,0.4c0.1,0.1,0.2,0.2,0.3,0.2c0.1,0,0.2,0.1,0.4,0.1c0.2,0,0.3,0,0.5-0.1c0.1-0.1,0.3-0.1,0.4-0.2l0.8,1.7c-0.2,0.2-0.5,0.3-0.9,0.4c-0.3,0.1-0.7,0.2-1.1,0.2c-0.4,0-0.8-0.1-1.1-0.2c-0.3-0.1-0.6-0.3-0.9-0.6s-0.5-0.6-0.6-0.9c-0.1-0.4-0.2-0.8-0.2-1.2v-3.6H516.1z" />
            </g>
          </g>
        </svg>
      </div>
    );
  }
}
