import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { AuthUser } from '@shared/types';
import { useAuth } from '@app/providers/auth';
import { SignInForm, type SignInFormValues } from '@features/sign-in';
import { SignUpForm, type SignUpFormValues } from '@features/sign-up';
import { http } from '@/shared/api/http';
import styles from './AuthPage.module.scss';

type AuthMode = 'sign-in' | 'sign-up';

export const AuthPage = () => {
  const { user, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.lead}>Проверка сессии…</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (path: '/auth/login' | '/auth/register', values: SignInFormValues) => {
    setError(null);
    setSubmitting(true);

    try {
      const { data } = await http.post<{ user: AuthUser }>(path, values);
      setUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Не удалось выполнить запрос';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = (values: SignInFormValues) => {
    void handleAuth('/auth/login', values);
  };

  const handleSignUp = (values: SignUpFormValues) => {
    void handleAuth('/auth/register', values);
  };

  return (
    <main className={styles.page}>
      <header className={styles.brand}>
        <p className={styles.eyebrow}>учебный проект</p>
        <h1 className={styles.heading}>Авторизация</h1>
        <p className={styles.lead}>Вход в аккаунт или регистрация</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.switch} role="tablist" aria-label="Режим авторизации">
          <button
            type="button"
            role="tab"
            id="auth-tab-sign-in"
            className={[styles.switchButton, mode === 'sign-in' ? styles.switchButtonActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-selected={mode === 'sign-in'}
            aria-controls="auth-panel"
            onClick={() => setMode('sign-in')}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            id="auth-tab-sign-up"
            className={[styles.switchButton, mode === 'sign-up' ? styles.switchButtonActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-selected={mode === 'sign-up'}
            aria-controls="auth-panel"
            onClick={() => setMode('sign-up')}
          >
            Регистрация
          </button>
        </div>

        <div
          id="auth-panel"
          role="tabpanel"
          aria-labelledby={mode === 'sign-in' ? 'auth-tab-sign-in' : 'auth-tab-sign-up'}
        >
          {mode === 'sign-in' ? (
            <SignInForm disabled={submitting} onSubmit={handleSignIn} />
          ) : (
            <SignUpForm disabled={submitting} onSubmit={handleSignUp} />
          )}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
};
