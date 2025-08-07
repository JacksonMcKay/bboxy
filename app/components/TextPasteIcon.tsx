import React, { ComponentProps } from 'react';
import IconTemplate from './IconTemplate';

const TextPasteIcon = ({
  size = 24,
  ...props
}: Omit<ComponentProps<typeof IconTemplate>, 'path' | 'viewBox' | 'size'> & {
  size?: number;
}): React.ReactElement => (
  <IconTemplate
    viewBox="0 0 32 32"
    size={size}
    path="M16 2c-1.257 0-2.14.893-2.584 2H5v25h22V4h-8.416C18.141 2.893 17.257 2 16 2zm0 2c.565 0 1 .435 1 1v1h3v2h-8V6h3V5c0-.565.435-1 1-1zM7 6h3v4h12V6h3v21H7V6zm5 8v2h3v7h2v-7h3v-2h-8z"
    {...props}
  />
);

export default TextPasteIcon;
