import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Avatar = () => {
  const [avatars, setAvatars] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/users/avatars")
      .then((res) => {
        const shuffled = res.data.sort(() => 0.5 - Math.random()); // Shuffle avatars
        setAvatars(shuffled.slice(0, 4)); // Pick only 4 random avatars
      })
      .catch((error) => console.error("Error fetching avatars:", error));
  }, []);

  const handleSelectAvatar = async (avatar) => {
    if (!user) {
      console.error("User not found in localStorage");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/users/avatar", {
        userId: user._id,
        avatarSrc: avatar.src,
      });

      // Update user object in localStorage immediately
      const updatedUser = { ...user, avatar: avatar.src };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      navigate("/chat"); // Redirect to chat after updating avatar
    } catch (error) {
      console.error("Error with backend request:", error);
    }
};


  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-3xl font-bold mb-8">Select Your Avatar</h2>
      <div className="flex flex-row gap-4">
        {avatars.map((avatar, index) => (
          <div key={index} className="flex flex-col items-center">
            <img
              src={avatar.src}
              alt={avatar.name}
              className="w-24 h-24 rounded-full cursor-pointer border-4 border-gray-300 hover:border-blue-500 transition"
              onClick={() => handleSelectAvatar(avatar)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Avatar;
