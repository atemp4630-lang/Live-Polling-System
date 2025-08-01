// Utility functions for managing localStorage in the polling system

export const pollStorage = {
  // Store answered poll IDs to prevent re-answering
  addAnsweredPoll: (pollId) => {
    const answered = JSON.parse(localStorage.getItem('answeredPolls') || '[]');
    if (!answered.includes(pollId)) {
      answered.push(pollId);
      localStorage.setItem('answeredPolls', JSON.stringify(answered));
    }
  },

  // Check if user has answered a specific poll
  hasAnsweredPoll: (pollId) => {
    const answered = JSON.parse(localStorage.getItem('answeredPolls') || '[]');
    return answered.includes(pollId);
  },

  // Clear answered polls (when user leaves session)
  clearAnsweredPolls: () => {
    localStorage.removeItem('answeredPolls');
  },

  // Store user session data
  setUserSession: (userData) => {
    localStorage.setItem('userSession', JSON.stringify(userData));
  },

  // Get user session data
  getUserSession: () => {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  },

  // Clear user session
  clearUserSession: () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('answeredPolls');
  }
};

export default pollStorage;