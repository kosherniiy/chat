import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Input.module.scss';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className, error, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <label className={styles.field} htmlFor={inputId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <input
          {...rest}
          ref={ref}
          id={inputId}
          className={[styles.input, error ? styles.inputInvalid : '', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
        {error ? (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
