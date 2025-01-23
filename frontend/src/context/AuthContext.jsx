import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isAdmin: false,
    token: null
  });

  useEffect(() => {
    // Check localStorage on mount
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (token) {
      setAuthState({
        isAuthenticated: true,
        isAdmin,
        token
      });
    }
  }, []);

  const login = (token, isAdmin = true) => {
    // First set the localStorage items
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('isAuthenticated', 'true');
    
    // Then update the state
    setAuthState({
      isAuthenticated: true,
      isAdmin: true,
      token
    });

    console.log('Auth state updated:', {
      isAuthenticated: true,
      isAdmin: true,
      token
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    
    setAuthState({
      isAuthenticated: false,
      isAdmin: false,
      token: null
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 