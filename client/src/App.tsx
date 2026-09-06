import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeProvider';
import { Guard } from './Guard';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ProblemListPage } from './pages/ProblemListPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/problems/:id" element={<WorkspacePage />} />
          
          <Route path="/submissions" element={<Guard><SubmissionsPage /></Guard>} />
          <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
          <Route path="/admin" element={<Guard adminOnly><AdminPage /></Guard>} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
