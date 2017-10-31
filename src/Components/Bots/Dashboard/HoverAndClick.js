import React from 'react';

export default class HoverAndClick extends React.Component {
  constructor(props) {
    super();

    this.fadeTime = 150;

    this.state = {
      hovering: false,
      clicked: false,
    };

    this.handleClick = this.handleClick.bind(this);
    this.startHover = this.startHover.bind(this);
    this.leaveHover = this.leaveHover.bind(this);
  }

  hslToString(hsl) {
    return `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
  }

  handleClick(e) {
    if (!this.props.allowDefault) {
      e.preventDefault();
    }

    setTimeout(() => {
      this.setState({ clicked: false });
    }, this.fadeTime);

    this.setState({ clicked: true });
  }

  startHover() {
    this.setState({ hovering: true });
  }

  leaveHover() {
    this.setState({ hovering: false });
  }

  render() {
    return (
      <div className="button--padding">
        {React.Children.map(this.props.children, (child) => {
          const extraProps = {
            style: {
              padding: '2px',
              backgroundColor: this.hslToString(
                this.state.hovering
                  ? { h: this.props.color.h, s: this.props.color.s, l: this.props.color.l + 10 }
                  : this.props.color,
              ),
              border: `2px solid ${this.hslToString(
                this.state.clicked
                  ? { h: this.props.color.h, s: this.props.color.s, l: this.props.color.l + 80 }
                  : { h: this.props.color.h, s: this.props.color.s, l: this.props.color.l },
              )}`,
              transition: `${this.fadeTime}ms`,
              transitionTimingFunction: 'ease',
            },
            onMouseOut: this.leaveHover,
            onMouseOver: this.startHover,
            onClick: (e) => {
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
