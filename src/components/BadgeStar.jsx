import stars from "../assets/stars.png";

const BadgeStar = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1 h-[31px] rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE]">
      <img src={stars} className="h-4 w-4" />
      <span className="text-sm font-semibold sora text-white">
        Intervue Poll
      </span>
    </div>
  );
};

export default BadgeStar;
