import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@shared/ui';
import styles from './SignUpForm.module.scss';

const signUpSchema = z
  .object({
    username: z.string().trim().min(1, 'Укажите имя'),
    password: z.string().min(1, 'Укажите пароль').min(4, 'Минимум 4 символа'),
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .superRefine((values, ctx) => {
    if (!values.confirmPassword || values.password === values.confirmPassword) {
      return;
    }

    ctx.addIssue({
      code: 'custom',
      message: 'Пароли не совпадают',
      path: ['confirmPassword'],
    });
  });

type SignUpFields = z.infer<typeof signUpSchema>;

export type SignUpFormValues = Omit<SignUpFields, 'confirmPassword'>;

type SignUpFormProps = {
  disabled?: boolean;
  onSubmit?: (values: SignUpFormValues) => void;
};

export const SignUpForm = ({ disabled = false, onSubmit }: SignUpFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFields>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  const username = watch('username');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit(({ username: nextUsername, password: nextPassword }) => {
        onSubmit?.({ username: nextUsername, password: nextPassword });
      })}
      noValidate
    >
      <p className={styles.hint}>Новый аккаунт: имя и пароль</p>

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
        autoComplete="new-password"
        disabled={disabled}
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Повтор пароля"
        type="password"
        placeholder="ещё раз"
        autoComplete="new-password"
        disabled={disabled}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button
        type="submit"
        disabled={disabled || !username.trim() || !password || !confirmPassword}
      >
        Создать аккаунт
      </Button>
    </form>
  );
};
