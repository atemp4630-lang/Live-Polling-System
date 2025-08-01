import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BadgeStar from "./BadgeStar";

const StudentPage = () => {
  const [name, setName] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && sessionCode.trim()) {
      joinSession();
    }
  };

  const joinSession = async () => {
    setLoading(true);
    setError("");
    
    const result = await login(name, 'student', sessionCode);
    
    if (result.success) {
      navigate('/PreQuestion');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 sora">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl text-center space-y-6 sm:space-y-10">
        <div className="inline-flex items-center justify-center ">
          <BadgeStar />
        </div>

        <div className="space-y-3 md:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-sora font-normal text-black">
            Let’s <span className="font-semibold">Get Started</span>
          </h1>
          <p className="text-[#5C5B5B] text-sm sm:text-base md:text-lg max-w-full md:max-w-2xl lg:max-w-3xl mx-auto px-2 sm:px-0">
            If you’re a student, you’ll be able to{" "}
            <strong className="text-black">submit your answers</strong>,
            participate in live polls, and see how your responses compare with
            your classmates.
          </p>
        </div>

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 w-full max-w-sm sm:max-w-md mx-auto"
        >
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="text-left">
            <label
              htmlFor="name"
              className="block mb-2 text-sm sm:text-base font-medium text-black"
            >
              Enter your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Rahul Bajaj"
              className="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg rounded-md bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            />
          </div>

          <div className="text-left">
            <label
              htmlFor="sessionCode"
              className="block mb-2 text-sm sm:text-base font-medium text-black"
            >
              Enter Session Code
            </label>
            <input
              id="sessionCode"
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              required
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg rounded-md bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-4 text-base sm:text-lg rounded-full bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {loading ? 'Joining...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default StudentPage;
