import { ReactNode } from 'react';

interface ToolButtonProps {
  children: ReactNode;
  isActive?: boolean;
  tooltip?: string;
  variant?: 'primary' | 'secondary';
}
interface ToolButtonPropsWithOnClick extends ToolButtonProps {
  onClick: () => void;
  href?: never;
}

interface ToolButtonPropsWithHref extends ToolButtonProps {
  href: string;
  onClick?: never;
}

export function ToolButton({
  children,
  isActive,
  onClick,
  href,
  tooltip,
  variant = 'primary',
}: ToolButtonPropsWithOnClick | ToolButtonPropsWithHref) {
  const variants = {
    primary: {
      active: 'bg-indigo-100 text-indigo-600',
      inactive:
        'text-gray-600 hover:bg-gray-100 active:text-gray-800 active:bg-gray-300',
    },
    secondary: {
      active: 'bg-emerald-100 text-emerald-700',
      inactive:
        'text-gray-600 hover:bg-gray-100 active:text-gray-800 active:bg-gray-300',
    },
  };

  const currentVariant = variants[variant];

  const props = {
    className: `cursor-pointer rounded-md p-2 transition-colors ${
      isActive ? currentVariant.active : currentVariant.inactive
    }`,
    title: tooltip,
    children,
  };

  return href ? (
    <a {...props} href={href} target="_blank" />
  ) : (
    <button {...props} onClick={onClick} />
  );
}
