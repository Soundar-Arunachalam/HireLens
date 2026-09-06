import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button className={`btn-icon ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light Theme">
        <Sun size={18} />
      </button>
      <button className={`btn-icon ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')} title="System Default">
        <Monitor size={18} />
      </button>
      <button className={`btn-icon ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark Theme">
        <Moon size={18} />
      </button>
    </div>
  );
}
