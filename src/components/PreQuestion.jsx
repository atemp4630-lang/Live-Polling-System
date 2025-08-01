import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { pollAPI } from "../utils/api";
import BadgeStar from "./BadgeStar";
import spinner from "../assets/spinner.png";

const PreQuestion = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { on, off, emit } = useSocket();
  const [connecting, setConnecting] = useState(true);
  const [socketStatus, setSocketStatus] = useState('Connecting...');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Check for existing active poll when component mounts
    const checkCurrentPoll = async () => {
      try {
        console.log('Checking for current poll...');
        const response = await pollAPI.getCurrent();
        if (response.data && response.data.poll) {
          console.log('Found active poll, navigating to poll page');
          navigate('/sque', { state: { poll: response.data.poll } });
        } else {
          console.log('No active poll found, waiting for teacher...');
          setConnecting(false);
        }
      } catch (error) {
        console.log('No active poll found or error:', error);
        // No active poll, stay on waiting screen
        setConnecting(false);
      }
    };
    
    checkCurrentPoll();

    // Listen for new polls
    const handleNewPoll = (pollData) => {
      console.log('New poll received in PreQuestion:', pollData);
      setSocketStatus('Received new poll, navigating to question page...');
      // Clear any previous poll state
      localStorage.removeItem('currentPollAnswered');
      navigate('/sque', { state: { poll: pollData } });
    };

    const handleCurrentPoll = (pollData) => {
      console.log('Current poll received in PreQuestion:', pollData);
      if (pollData && pollData.id) {
        // Check if user already answered this poll
        const answeredPolls = JSON.parse(localStorage.getItem('answeredPolls') || '[]');
        const hasAnswered = answeredPolls.includes(pollData.id);
        
        if (hasAnswered) {
          pollData.hasVoted = true;
        }
        
        navigate('/sque', { state: { poll: pollData } });
      }
    };

    const handleKickedOut = () => {
      logout();
      navigate('/kick-out');
    };

    const handleConnect = () => {
      console.log('Socket connected in PreQuestion');
      setSocketStatus('Connected, waiting for teacher to start a poll...');
      setConnecting(false);
      // Request current poll on connect
      emit('get_current_poll');
    };

    // Debug socket connection
    console.log('Setting up socket listeners in PreQuestion');
    
    on('new_poll', handleNewPoll);
    on('current_poll', handleCurrentPoll);
    on('kicked_out', handleKickedOut);
    on('connect', handleConnect);

    return () => {
      off('new_poll', handleNewPoll);
      off('current_poll', handleCurrentPoll);
      off('kicked_out', handleKickedOut);
      off('connect', handleConnect);
    };
  }, [user, navigate, logout, on, off, emit]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5">
      <BadgeStar />
      <img src={spinner} className="animate-spin h-10 w-10" alt="Loading" />
      <p className="text-black font-semibold text-[33px] text-center sora">
        {connecting ? 'Connecting...' : 'Wait for the teacher to ask questions...'}
      </p>
      {user && (
        <p className="text-gray-500 text-lg sora">
          Welcome, {user.name}!
        </p>
      )}
    </div>
  );
};

export default PreQuestion;
