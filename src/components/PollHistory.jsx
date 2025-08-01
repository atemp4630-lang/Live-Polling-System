import PollOption from "./PollOption";
const PollHistory = ({ data }) => {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-screen bg-white px-4 py-8 sora">
      <h1 className="text-[40px]  relative me-80 text-center">
        View <span className="font-semibold">Poll History</span>
      </h1>
      {safeData.map((poll, index) => {
        const totalVotes = poll.options.reduce(
          (sum, opt) => sum + opt.votes,
          0
        );
        return (
          <div className="max-w-xl w-full mx-auto pt-8" key={index}>
            {/* Question Number above the box */}
            <div className="text-black font-semibold text-xl mb-5">
              Question {index + 1}
            </div>
            {/* Question Box */}
            <div className="border border-[#AF8FF1] rounded-lg overflow-hidden shadow">
              <div className="bg-gradient-to-r from-[#343434] to-[#6E6E6E] px-4 py-3">
                <span className="text-white font-semibold text-sm">
                  {poll.question}
                </span>
              </div>

              <div className="p-4 mt-4">
                {poll.options.map((option) => (
                  <PollOption
                    key={option.id}
                    option={{ ...option, totalVotes }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PollHistory;
