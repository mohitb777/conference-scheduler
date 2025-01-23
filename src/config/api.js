const API_BASE_URL = 'https://conference-scheduler-i7u3wxsti-mohits-projects-a2c7dc06.vercel.app/api';

export const API_URLS = {
  LOGIN: `${API_BASE_URL}/users/login`,
  SCHEDULE: {
    ALL: `${API_BASE_URL}/schedule/all`,
    SEND_EMAILS: `${API_BASE_URL}/schedule/send-emails`,
    SEND_CONFIRMATION: (paperId) => `${API_BASE_URL}/schedule/send-confirmation/${paperId}`,
    CHECK: (paperId) => `${API_BASE_URL}/schedule/check/${paperId}`,
    RESCHEDULE: (paperId) => `${API_BASE_URL}/schedule/reschedule/${paperId}`
  }
};

export default API_BASE_URL;
