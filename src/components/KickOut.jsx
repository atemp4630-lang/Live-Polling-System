import React from "react";
import BadgeStar from "./BadgeStar";

const KickOut = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-5 sora">
      <BadgeStar />
      <h2 className="text-black font-normal text-[40px] text-center">
        You’ve been Kicked out !
      </h2>
      <p className="text-[#6E6E6E] font-normal text-[19px] text-center">
        Looks like the teacher had removed you from the poll system .Please Try
        again sometime.
      </p>
    </div>
  );
};

export default KickOut;
