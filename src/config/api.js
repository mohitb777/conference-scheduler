const API_BASE_URL = 'https://conference-scheduler-bay.vercel.app/api';

const API_ENDPOINTS = {
  LOGIN: '/users/login',
  REGISTER: '/users/register',
  SCHEDULE: {
    ALL: '/schedule/all',
    SAVE: '/schedule/save',
    SEND_EMAILS: '/schedule/send-emails',
    SEND_CONFIRMATION: (paperId) => `/schedule/send-confirmation/${paperId}`,
    CHECK: (paperId) => `/schedule/check/${paperId}`,
    RESCHEDULE: (paperId) => `/schedule/reschedule/${paperId}`
  }
};

// Default fetch options
const defaultOptions = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
};

export { API_BASE_URL, API_ENDPOINTS, defaultOptions };
