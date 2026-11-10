import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AuthUser } from '@chat/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@shared/ui';
import { http } from '@/shared/api/http';
import styles from './AuthForm.module.scss';

const authSchema = z.object({
  username: z.string().trim().min(1, 'Укажите имя'),
  password: z.string().min(1, 'Укажите пароль').min(4, 'Минимум 4 символа'),
});

type AuthFormValues = z.infer<typeof authSchema>;
type AuthMode = 'login' | 'register';

type AuthFormProps = {
  onSuccess: (user: AuthUser) => void;
};

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: '', password: '' },
  });

  const username = watch('username');
  const password = watch('password');

  const submit = async (values: AuthFormValues) => {
    setError(null);

    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await http.post<{ user: AuthUser }>(path, values);
      onSuccess(data.user);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Не удалось выполнить запрос';
      setError(message);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={[styles.tab, mode === 'login' ? styles.tabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            setMode('login');
            setError(null);
          }}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={[styles.tab, mode === 'register' ? styles.tabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            setMode('register');
            setError(null);
          }}
        >
          Регистрация
        </button>
      </div>

      <div className={styles.intro}>
        <h2 className={styles.title}>{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h2>
        <p className={styles.hint}>JWT сохранится в cookie Authorization</p>
      </div>

      <Input
        label="Имя пользователя"
        autoComplete="username"
        disabled={isSubmitting}
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Пароль"
        type="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        disabled={isSubmitting}
        error={errors.password?.message}
        {...register('password')}
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <Button type="submit" disabled={isSubmitting || !username.trim() || password.length < 4}>
        {isSubmitting ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
};
