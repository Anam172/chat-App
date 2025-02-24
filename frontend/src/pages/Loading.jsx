import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Loading() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/avatar");
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <img src="/loading.gif" alt="Loading Logo" className="w-24 h-24" />
      <p className="text-lg font-bold mt-2">Loading...</p>
    </div>
  );
}

export default Loading;
