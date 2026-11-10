import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
};

export const Button = ({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) => {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
};
