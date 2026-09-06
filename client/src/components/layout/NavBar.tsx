import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function NavBar() {
  const { user, logout, isAuth } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">HL</span>
        HireLens
      </Link>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Problems</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Leaderboard</NavLink>
        {isAuth && (
          <NavLink to="/submissions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Submissions</NavLink>
        )}
        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ color: 'var(--wa)' }}>Admin</NavLink>
        )}
      </div>

      <div className="navbar-right">
        <ThemeToggle />
        {isAuth ? (
          <>
            <NavLink to="/profile" title={user?.username}>
              <div className="avatar">{user?.username[0].toUpperCase()}</div>
            </NavLink>
            <button className="btn btn-ghost" onClick={() => { logout(); nav('/'); }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-ghost">Log in</Link>
            <Link to="/register" className="btn btn-primary">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
