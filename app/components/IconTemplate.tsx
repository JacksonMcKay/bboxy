import React from 'react';

/** Template component for SVG icons. Just provide `path` and `viewBox`. */
const IconTemplate = ({
  path,
  viewBox,
  size,
  color = 'currentColor',
}: {
  path: string;
  viewBox: string;
  size: number;
  color?: string;
}): React.ReactElement => (
  <svg
    height={size}
    viewBox={viewBox}
    style={{
      fill: color,
      stroke: 'none',
    }}
  >
    <path fill={color} d={path} />
  </svg>
);

IconTemplate.defaultProps = {
  color: 'currentColor',
};

export default IconTemplate;
