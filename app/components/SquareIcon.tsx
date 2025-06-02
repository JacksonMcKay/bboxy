import React, { ComponentProps } from 'react';
import IconTemplate from './IconTemplate';

const SquareIcon = ({
  size = 24,
  ...props
}: Omit<ComponentProps<typeof IconTemplate>, 'path' | 'viewBox' | 'size'> & {
  size?: number;
}): React.ReactElement => (
  <IconTemplate
    viewBox="0 0 32 32"
    size={size}
    path="M9 4C6.25 4 4 6.25 4 9v14c0 2.75 2.25 5 5 5h14c2.75 0 5-2.25 5-5V9c0-2.75-2.25-5-5-5H9zm0 2h14c1.668 0 3 1.332 3 3v14c0 1.668-1.332 3-3 3H9c-1.668 0-3-1.332-3-3V9c0-1.668 1.332-3 3-3z"
    {...props}
  />
);

export default SquareIcon;
