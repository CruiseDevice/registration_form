import React, { useState, useEffect } from 'react';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import WelcomePage from './pages/WelcomePage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

type AppState = 'login' | 'register' | 'welcome' | 'profile';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      setCurrentState('welcome');
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
    setCurrentState('welcome');
  };

  const handleRegistrationSuccess = (user: any) => {
    // After successful registration, redirect to login
    setCurrentState('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentState('login');
  };

  const handleSwitchToLogin = () => {
    setCurrentState('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentState('register');
  };

  const handleGoToProfile = () => {
    setCurrentState('profile');
  };

  const handleBackToWelcome = () => {
    setCurrentState('welcome');
  };

  if (currentState === 'register') {
    return (
      <div className="App">
        <RegistrationForm onSuccess={handleRegistrationSuccess} />
        <div className="text-center mt-4">
          <button
            onClick={handleSwitchToLogin}
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    );
  }

  if (currentState === 'login') {
    return (
      <div className="App">
        <LoginForm 
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={handleSwitchToRegister}
        />
      </div>
    );
  }

  if (currentState === 'welcome' && isAuthenticated) {
    return (
      <div className="App">
        <WelcomePage 
          onLogout={handleLogout}
          onGoToProfile={handleGoToProfile}
        />
      </div>
    );
  }

  if (currentState === 'profile' && isAuthenticated) {
    return (
      <div className="App">
        <ProfilePage 
          onLogout={handleLogout}
          onBackToWelcome={handleBackToWelcome}
        />
      </div>
    );
  }

  // Fallback to login if not authenticated
  return (
    <div className="App">
      <LoginForm 
        onSuccess={handleLoginSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
    </div>
  );
}

export default App;