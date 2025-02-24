import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await axios.post("http://localhost:5000/auth/login", {
        email,
        password,
      }, {
        headers: { "Content-Type": "application/json" }
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/loading");
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Login failed");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const { data } = await axios.post("http://localhost:5000/auth/google", {
        token: credentialResponse.credential,
      }, {
        headers: { "Content-Type": "application/json" }
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/loading");
      }
    } catch (error) {
      console.error("Google login error:", error.response?.data || error.message);
      alert("Google login failed. Try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="bg-gray-50 p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="mt-4 w-full">
          <h2 className="text-2xl text-center pb-4 font-bold">Login</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border p-2 rounded w-full mb-4"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border p-2 rounded w-full mb-4"
          />
          <button type="submit" className="bg-zinc-500 text-white px-4 py-2 rounded w-full">
            Login
          </button>
        </form>
        <div className="flex items-center w-full my-4">
          <div className="flex-1 border-t border-gray-400"></div>
          <span className="px-4 text-gray-500">OR</span>
          <div className="flex-1 border-t border-gray-400"></div>
        </div>
        <GoogleLogin onSuccess={handleGoogleLogin} onError={() => alert("Google login failed")} />
        <p className="mt-4 text-center">
          Don't have an account? <Link to="/signup" className="text-blue-500 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
