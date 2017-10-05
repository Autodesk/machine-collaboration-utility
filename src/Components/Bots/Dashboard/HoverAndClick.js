import React from 'react';
import _ from 'underscore';

export default class HoverAndClick extends React.Component {
  constructor(props) {
    super();

    this.fadeTime = 150;

    const borderColor = Object.assign({}, props.color);
    borderColor.l -= 10;

    this.state = {
      color: props.color,
      borderColor,
    };

    this.handleClick = this.handleClick.bind(this);
    this.startHover = this.startHover.bind(this);
    this.leaveHover = this.leaveHover.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const borderColor = Object.assign({}, nextProps.color);
    borderColor.l -= 10;

    this.setState({
      color: nextProps.color,
      borderColor,
    });
  }

  hslToString(hsl) {
    return `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
  }

  handleClick(e) {
    if (!this.props.allowDefault) {
      e.preventDefault();
    }

    setTimeout(() => {
      const borderColor = Object.assign({}, this.props.color);
      borderColor.l -= 10;

      this.setState({ borderColor });
    }, this.fadeTime);

    const borderColor = Object.assign({}, this.props.color);
    borderColor.l += 80;
    this.setState({ borderColor });
  }

  startHover() {
    const color = Object.assign({}, this.props.color);
    color.l += 10;
    this.setState({ color });
  }

  leaveHover() {
    this.setState({ color: this.props.color });
  }

  render() {
    return (
      <div>
        {React.Children.map(this.props.children, (child) => {
          const extraProps = {
            style: {
              padding: '3px',
              backgroundColor: this.hslToString(this.state.color),
              border: `3px solid ${this.hslToString(this.state.borderColor)}`,
              transition: `${this.fadeTime}ms`,
              transitionTimingFunction: 'ease',
            },
            onMouseOut: this.leaveHover,
            onMouseOver: this.startHover,
            onClick: (e) => {
              this.setState({ color: this.props.color });
              this.handleClick(e);
              if (typeof child.props.onClick === 'function') {
                child.props.onClick();
              }
            },
          };

          return React.cloneElement(child, extraProps);
        })}
      </div>
    );
  }
}
