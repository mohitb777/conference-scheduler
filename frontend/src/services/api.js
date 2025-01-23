const API_BASE_URL = import.meta.env.VITE_API_URL;

export const fetchPapers = async () => {
  const response = await fetch(`${API_BASE_URL}/papers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch papers: ${response.status}`);
  }
  return response.json();
};

export const checkSchedule = async (paperId) => {
  const response = await fetch(`${API_BASE_URL}/schedule/check/${paperId}`);
  if (!response.ok) {
    throw new Error(`Failed to check schedule: ${response.status}`);
  }
  return response.json();
};

// Add more API methods as needed 