import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const RescheduleRequestPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [previousChoice, setPreviousChoice] = useState(null);

  useEffect(() => {
    // Hide navbar when component mounts
    document.body.style.marginTop = '0';
    const navbar = document.querySelector('nav');
    if (navbar) {
      navbar.style.display = 'none';
    }

    return () => {
      const navbar = document.querySelector('nav');
      if (navbar) {
        navbar.style.display = '';
      }
      document.body.style.marginTop = '';
    };
  }, []);

  useEffect(() => {
    const processRescheduleRequest = async () => {
      try {
        const response = await fetch(`http://conference-scheduler-bay.vercel.app/api/schedule/reschedule-request/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();

        if (response.ok) {
          setStatus('completed');
          toast.success('Reschedule request submitted successfully');
          setTimeout(() => window.close(), 3000);
        } else {
          setStatus('error');
          if (data.status !== 0) {
            setPreviousChoice(data.message);
          }
          setErrorMessage(data.message || 'Failed to process your request');
        }
      } catch (error) {
        console.error('Error:', error);
        setStatus('error');
        setErrorMessage('Error processing your request');
      }
    };

    if (token) {
      processRescheduleRequest();
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
        {status === 'processing' && (
          <>
            <div style={{ 
              border: '4px solid #f39c12',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '1rem' }}>Processing your reschedule request...</p>
          </>
        )}

        {status === 'completed' && (
          <>
            <h2 style={{ color: '#f39c12', marginBottom: '1rem' }}>Request Submitted</h2>
            <p>Your reschedule request has been submitted. We will contact you soon.</p>
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
    </div>
  );
};

export default RescheduleRequestPage; 