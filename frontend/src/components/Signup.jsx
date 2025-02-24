import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
  
    try {
      const { data } = await axios.post("http://localhost:5000/auth/register", {
        name,
        email,
        password,
      }, {
        headers: { "Content-Type": "application/json" }
      });
  
      console.log("Signup Response:", data); // Logs response
      alert("Signup successful! Redirecting to login.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    }
  };
  
  return (
    <div className="flex flex-col items-center max-w-lg m-auto justify-center h-screen">
      <div className="bg-gray-50 p-12 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="w-full">
          <h2 className="text-2xl text-center font-bold pb-4">Sign Up</h2>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="border p-2 rounded w-full mb-4"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border p-2 rounded w-full mb-4"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border p-2 rounded w-full mb-4"
            required
          />
          <button type="submit" className="bg-zinc-500 text-white px-4 py-2 rounded w-full">
            Sign Up
          </button>
        </form>

        <p className="mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
