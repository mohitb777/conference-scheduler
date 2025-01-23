import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminSetupPage from './components/AdminSetupPage';
import ScheduleViewer from './components/ScheduleViewer';
import ConferencePage from './components/ConferencePage';
import NavigationBar from './components/NavigationBar';
import AuthPage from './components/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import DebugView from './components/DebugView';
import { Toaster } from 'react-hot-toast';
import ConfirmationPage from './components/ConfirmationPage';
import { AuthProvider } from './context/AuthContext';
import DenyPage from './components/DenyPage';
import RescheduleRequestPage from './components/RescheduleRequestPage';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              maxWidth: '500px',
              textAlign: 'center',
              marginTop: '20px'
            },
            duration: 3000,
          }}
        />
        <div className="min-h-screen bg-gray-50">
          <NavigationBar />
          <Routes>
            <Route path="/" element={<ConferencePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-100">
                  <div className="container mx-auto px-4 py-8">
                    <AdminSetupPage />
                  </div>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/schedule" element={<ScheduleViewer />} />
            <Route path="/debug" element={<DebugView />} />
            <Route path="/confirm/:token" element={<ConfirmationPage />} />
            <Route path="/deny/:token" element={<DenyPage />} />
            <Route path="/reschedule-request/:token" element={<RescheduleRequestPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;