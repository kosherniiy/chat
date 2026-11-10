import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthContextProvider } from '@app/providers/auth';
import { AuthPage } from '@pages/auth';
import { ChatPage } from '@pages/chat';
import { WsDebugToggle } from '@widgets/ws-debug-toggle';

export const App = () => {
  return (
    <AuthContextProvider>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {import.meta.env.DEV ? <WsDebugToggle /> : null}
        </div>
      </BrowserRouter>
    </AuthContextProvider>
  );
};
