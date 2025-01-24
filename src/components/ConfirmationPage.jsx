import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const ConfirmationPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('confirming');
  const [errorMessage, setErrorMessage] = useState('');
  const [previousChoice, setPreviousChoice] = useState(null);

  useEffect(() => {
    // Hide navbar when component mounts
    document.body.style.marginTop = '0';
    const navbar = document.querySelector('nav');
    if (navbar) {
      navbar.style.display = 'none';
    }

    // Cleanup function to restore navbar when component unmounts
    return () => {
      const navbar = document.querySelector('nav');
      if (navbar) {
        navbar.style.display = '';
      }
      document.body.style.marginTop = '';
    };
  }, []);

  useEffect(() => {
    const confirmAttendance = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/schedule/confirm/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('Response:', response.status, data);

        if (response.ok) {
          setStatus('confirmed');
          toast.success('Attendance confirmed successfully');
          setTimeout(() => window.close(), 3000);
        } else {
          setStatus('error');
          if (data.status !== 0) {
            setPreviousChoice(data.message);
          }
          setErrorMessage(data.message || 'Confirmation failed');
        }
      } catch (error) {
        console.error('Error:', error);
        setStatus('error');
        setErrorMessage('Error confirming attendance');
      }
    };

    if (token) {
      confirmAttendance();
    }
  }, [token]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {status === 'confirming' && (
          <>
            <div style={{ 
              border: '4px solid #2ecc71',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '1rem' }}>Confirming your attendance...</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <h2 style={{ color: '#2ecc71', marginBottom: '1rem' }}>Confirmed!</h2>
            <p>Your attendance has been confirmed successfully.</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              This window will close automatically...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>
              {previousChoice ? 'Previous Choice Found' : 'Error'}
            </h2>
            <p>{errorMessage}</p>
          </>
        )}
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ConfirmationPage; 