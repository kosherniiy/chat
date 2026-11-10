import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@shared/ui';
import styles from './SignInForm.module.scss';

const signInSchema = z.object({
  username: z.string().trim().min(1, 'Укажите имя'),
  password: z.string().min(1, 'Укажите пароль').min(4, 'Минимум 4 символа'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

type SignInFormProps = {
  disabled?: boolean;
  onSubmit?: (values: SignInFormValues) => void;
};

export const SignInForm = ({ disabled = false, onSubmit }: SignInFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: '', password: '' },
  });

  const username = watch('username');
  const password = watch('password');

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit((values) => onSubmit?.(values))}
      noValidate
    >
      <p className={styles.hint}>Имя и пароль от аккаунта</p>

      <Input
        label="Имя"
        placeholder="например, Alex"
        autoComplete="username"
        disabled={disabled}
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Пароль"
        type="password"
        placeholder="минимум 4 символа"
        autoComplete="current-password"
        disabled={disabled}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" disabled={disabled || !username.trim() || !password}>
        Войти
      </Button>
    </form>
  );
};
