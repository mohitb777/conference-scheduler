const API_BASE_URL = 'https://conference-scheduler-bay.vercel.app/api';

export const API_URLS = {
  LOGIN: `${API_BASE_URL}/users/login`,
  REGISTER: `${API_BASE_URL}/users/register`,
  SCHEDULE: {
    ALL: `${API_BASE_URL}/schedule/all`,
    SEND_EMAILS: `${API_BASE_URL}/schedule/send-emails`,
    SEND_CONFIRMATION: (paperId) => `${API_BASE_URL}/schedule/send-confirmation/${paperId}`,
    CHECK: (paperId) => `${API_BASE_URL}/schedule/check/${paperId}`,
    RESCHEDULE: (paperId) => `${API_BASE_URL}/schedule/reschedule/${paperId}`
  }
};

export default API_BASE_URL;
