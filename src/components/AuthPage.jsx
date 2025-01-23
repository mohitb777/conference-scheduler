import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from '../context/AuthContext';

const AuthPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
      const requestBody = isLogin ? {
        username: formData.username,
        password: formData.password
      } : formData;

      console.log('Sending request with body:', requestBody);

      const response = await fetch(`https://conference-scheduler-ns0z4zt2b-mohits-projects-a2c7dc06.vercel.app.app${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        if (!data.token) {
          toast.error('No token received from server');
          return;
        }

        login(data.token, true);
        localStorage.setItem('isAuthenticated', 'true');
        toast.success(isLogin ? 'Login successful' : 'Registration successful');
        
        setTimeout(() => {
          navigate('/admin');
        }, 500);
      } else {
        toast.error(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Error during authentication');
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      fullName: '',
      username: '',
      password: ''
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="mb-4">
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          ← Back to Home
        </Link>
      </div>
      <div className="fixed inset-0 w-full h-full font-roboto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="relative w-[800px] h-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-in-out hover:shadow-3xl">
          {/* Forms Container */}
          <div className="absolute w-full h-full flex">
            {/* Sign Up Form */}
            <div
              className={`w-1/2 transform transition-all duration-700 ease-in-out ${
                isLogin ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              <div className="h-full flex flex-col items-center justify-center p-8">
                <h2 className="text-2xl font-bold text-blue-900 mb-6 transition-all duration-300 transform hover:-translate-y-1">Sign Up</h2>
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                  >
                    Sign Up
                  </button>
                </form>
              </div>
            </div>

            {/* Login Form */}
            <div
              className={`w-1/2 transform transition-all duration-700 ease-in-out ${
                isLogin ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
              }`}
            >
              <div className="h-full flex flex-col items-center justify-center p-8">
                <h2 className="text-2xl font-bold text-blue-900 mb-6 transition-all duration-300 transform hover:-translate-y-1">Login</h2>
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:-translate-y-0.5"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                  >
                    Login
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <div
            className={`absolute top-0 w-1/2 h-full flex items-center justify-center transform transition-all duration-700 ease-in-out ${
              isLogin ? "left-0 rotate-0" : "right-0 rotate-180"
            }`}
          >
            <div className={`flex flex-col items-center gap-2 transform ${isLogin ? "rotate-0" : "rotate-180"}`}>
              <p className="text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={toggleForm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
