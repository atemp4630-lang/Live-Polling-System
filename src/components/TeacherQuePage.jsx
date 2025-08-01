import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { pollAPI, sessionAPI } from "../utils/api";
import PollOption from "./PollOption";
import eye from "../assets/eye.png";
import { FaCopy } from "react-icons/fa";

const TeacherQuePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { on, off, emit } = useSocket();

  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "teacher") {
      navigate("/");
      return;
    }

    fetchSessionInfo();
    getCurrentPoll();

    // Socket listeners
    const handlePollUpdate = (data) => {
      console.log('Poll update received:', data);
      setResults(data.results);
    };

    const handleNewPoll = (pollData) => {
      console.log('New poll received in TeacherQuePage:', pollData);
      setPoll(pollData);
      // Convert options to results format
      const initialResults = pollData.options.map((option, index) => ({
        id: index + 1,
        text: option.text,
        votes: option.votes || 0,
      }));
      setResults(initialResults);
      setLoading(false);
    };

    const handleCurrentPoll = (pollData) => {
      console.log('Current poll received in TeacherQuePage:', pollData);
      setPoll(pollData);
      const initialResults = pollData.options.map((option, index) => ({
        id: index + 1,
        text: option.text,
        votes: option.votes || 0,
      }));
      setResults(initialResults);
      setLoading(false);
    };

    const handlePollEnded = (data) => {
      console.log('Poll ended in TeacherQuePage:', data);
      if (poll && poll.id === data.id) {
        setResults(data.results.map((result, index) => ({
          id: index + 1,
          text: result.text,
          votes: result.votes
        })));
      }
    };

    on("poll_update", handlePollUpdate);
    on("new_poll", handleNewPoll);
    on("current_poll", handleCurrentPoll);
    on("poll_ended", handlePollEnded);

    return () => {
      off("poll_update", handlePollUpdate);
      off("new_poll", handleNewPoll);
      off("current_poll", handleCurrentPoll);
      off("poll_ended", handlePollEnded);
    };
  }, [user, navigate, on, off]);

  const fetchSessionInfo = async () => {
    try {
      const response = await sessionAPI.getCurrent();
      if (response.data && response.data.session) {
        setSessionCode(response.data.session.code);
      }
    } catch (error) {
      console.error("Error fetching session info:", error);
    }
  };

  const getCurrentPoll = async () => {
    try {
      console.log('Fetching current poll for teacher...');
      const response = await pollAPI.getCurrent();
      const pollData = response.data.poll;
      console.log('Current poll data:', pollData);
      setPoll(pollData);

      // Convert options to results format
      const initialResults = pollData.options.map((option, index) => ({
        id: index + 1,
        text: option.text,
        votes: option.votes || 0,
      }));
      setResults(initialResults);
      setLoading(false);
    } catch (error) {
      console.log("No active poll found, waiting for new poll...");
      setLoading(false);
    } finally {
      // Request current poll via socket as backup
      emit('get_current_poll');
    }
  };

  const handleEndPoll = async () => {
    try {
      emit('end_poll');
      setTimeout(() => {
        navigate("/teacher");
      }, 1000);
    } catch (error) {
      console.error("End poll error:", error);
    }
  };

  const totalVotes = results.reduce((sum, opt) => sum + opt.votes, 0);

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5 sora">
        <p className="text-black font-semibold text-2xl">Loading poll...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5 sora">
        <p className="text-black font-semibold text-2xl">
          No active poll found
        </p>
        <button
          onClick={() => navigate("/teacher")}
          className="px-6 py-3 bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white font-semibold rounded-full"
        >
          Create New Poll
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative px-4 py-10 sora">
      {/* Top-right buttons */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
        {sessionCode && (
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 shadow-sm">
            <div className="mr-3">
              <span className="text-sm text-gray-500">Session Code:</span>
              <span className="ml-2 font-bold text-[#8F64E1]">
                {sessionCode}
              </span>
            </div>
            <button
              onClick={copySessionCode}
              className="text-[#8F64E1] hover:text-[#7048C6] transition-colors"
              title="Copy session code"
            >
              <FaCopy />
              {copied && (
                <span className="ml-1 text-xs text-green-600">Copied!</span>
              )}
            </button>
          </div>
        )}
        <button
          onClick={() => navigate("/poll-hist")}
          className="flex items-center gap-2 cursor-pointer bg-[#8F64E1] text-white text-sm font-medium px-5 py-2 rounded-full shadow"
        >
          <img src={eye} className="h-5 w-5" />
          View Poll history
        </button>
      </div>

      <div className="max-w-xl w-full mx-auto pt-14">
        {/* Question Number above the box */}
        <div className="text-black font-semibold text-xl mb-5">
          Current Poll - {totalVotes} votes
        </div>

        {/* Question Box */}
        <div className="border border-[#AF8FF1] rounded-lg overflow-hidden shadow">
          <div className="bg-gradient-to-r from-[#343434] to-[#6E6E6E] px-4 py-3">
            <span className="text-white font-semibold text-sm">
              {poll.question}
            </span>
          </div>

          <div className="p-4 mt-4">
            {results.map((option) => (
              <PollOption key={option.id} option={{ ...option, totalVotes }} />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end mb-6 mt-8 gap-4">
          <button
            onClick={handleEndPoll}
            className="flex items-center gap-2 cursor-pointer bg-red-500 text-white text-sm font-medium px-5 py-3 rounded-full shadow hover:bg-red-600"
          >
            End Poll
          </button>
          <button
            onClick={() => navigate("/teacher")}
            className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white text-sm font-medium px-5 py-3 rounded-full shadow"
          >
            + Ask new question
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuePage;
