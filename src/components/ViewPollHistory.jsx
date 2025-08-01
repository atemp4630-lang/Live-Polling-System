import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { pollAPI } from "../utils/api";
import PollHistory from "./PollHistory";

const ViewPollHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/');
      return;
    }

    fetchPollHistory();
  }, [user, navigate]);

  const fetchPollHistory = async () => {
    try {
      const response = await pollAPI.getHistory();
      const pollsData = response.data.polls.map(poll => ({
        question: poll.question,
        options: poll.results.map((result, index) => ({
          id: index + 1,
          text: result.text,
          votes: result.votes
        }))
      }));
      setPolls(pollsData);
    } catch (error) {
      console.error('Fetch poll history error:', error);
      setError('Failed to load poll history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5 sora">
        <p className="text-black font-semibold text-2xl">Loading poll history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5 sora">
        <p className="text-red-500 font-semibold text-xl">{error}</p>
        <button
          onClick={() => navigate('/tque')}
          className="px-6 py-3 bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white font-semibold rounded-full"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return <PollHistory data={polls} />;
};

export default ViewPollHistory;
