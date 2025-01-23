import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import acroLogo from '/src/assets/Acro.png';
import homeIcon from '/src/assets/download.png';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const NavigationBar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout: contextLogout } = useAuth();
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [showDropdown, setShowDropdown] = useState(false);
  const firstLetter = username ? username.charAt(0).toUpperCase() : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.avatar-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (isAuthenticated && token && !username) {
        try {
          const response = await fetch('http://conference-scheduler-bay.vercel.app/api/users/me', {
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUsername(data.username);
            localStorage.setItem('username', data.username);
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        }
      }
    };

    fetchUsername();
  }, [isAuthenticated, username]);

  const handleAdminClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/admin');
  };

  const handleLogout = async () => {
    try {
      contextLogout();
      setUsername('');
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  const handleAvatarClick = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <header className="bg-white text-blue-900 py-2 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center">
          <img 
            src={acroLogo}
            alt="Acropolis Logo"
            className="h-10 object-contain"
          />
        </div>
        <nav className="flex items-center space-x-4">
          <img 
            src={homeIcon}
            alt="Home"
            onClick={() => navigate('/')}
            className="h-4 w-4 cursor-pointer hover:opacity-80 transition-opacity"
          />
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => navigate('/schedule')}
            className="hover:underline"
          >
            Presentation Schedule
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={handleAdminClick}
            className="hover:underline"
          >
            {isAuthenticated ? 'Admin Page' : 'Login'}
          </button>
          {isAuthenticated && (
            <div className="relative avatar-dropdown">
              <button
                onClick={handleAvatarClick}
                className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold ml-4 hover:bg-blue-600 transition-colors"
              >
                {firstLetter}
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    Signed in as <br/>
                    <span className="font-medium">{username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default NavigationBar; 