import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";

const socket = io("http://localhost:5000");

const Chat = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (storedUser) {
      setUser(storedUser);
      socket.emit("userConnected", storedUser._id);
    }

    const fetchUsers = async () => {
      try {
        const [usersRes] = await Promise.all([
          axios.get("http://localhost:5000/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        let filteredUsers = usersRes.data.filter(
          (usr) => usr._id !== storedUser?._id
        );

        setUsers([storedUser, ...filteredUsers]);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser && user) {
      axios
        .get(`http://localhost:5000/api/chat/${user._id}/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setMessages(res.data))
        .catch((err) => console.error("Error fetching chat history:", err));
    }
  }, [selectedUser, user]);

  useEffect(() => {
    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });
  
    return () => {
      socket.off("receiveMessage");
    };
  }, []);  
  

  const sendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("sender", user._id);
    formData.append("receiver", selectedUser._id);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    formData.append("message", message.trim());

    try {
      const response = await axios.post(
        "http://localhost:5000/api/chat/send",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      socket.emit("sendMessage", response.data);
      setMessages((prev) => [...prev, response.data]);
      setMessage("");
      setSelectedFile(null);
      document.getElementById("file-input").value = "";
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };
  
  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Users List */}
      <div className="w-1/4 bg-white p-4 shadow-lg relative">
        <h3 className="text-xl font-bold mb-4">Users</h3>
        <ul className="space-y-2">
          {users.map((usr, index) => (
            <li
              key={usr._id || index}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition duration-200 ${
                selectedUser?._id === usr._id ? "bg-gray-50" : "hover:bg-gray-200"
              }`}
              onClick={() => setSelectedUser(usr)}
            >
              <img
                src={usr.avatar || "/avatars/defaultUser.jpg"}
                alt={usr.name}
                className="w-10 h-10 rounded-full border-2 border-gray-100"
              />
              <span className="text-lg">
                {usr.name} {usr._id === user?._id ? "(You)" : ""}
              </span>
            </li>
          ))}
        </ul>

        {/* Logged-in User at Bottom Left */}
        {user && (
          <div className="absolute bottom-4 left-4 flex items-center gap-3 p-3 bg-gray-200 rounded-lg w-[90%] shadow-md">
            <img
              src={user.avatar || "/avatars/defaultUser.jpg"}
              alt="Your Avatar"
              className="w-12 h-12 rounded-full border-2 border-gray-400"
            />
            <span className="font-semibold text-lg">{user.name} (You)</span>
          </div>
        )}
      </div>

      {/* Right Side - Chat Area */}
<div className="flex-1 flex flex-col justify-between p-4 bg-white shadow-lg relative">
  {selectedUser ? (
    <>
      <h2 className="text-2xl font-semibold border-b pb-2 mb-2 flex items-center gap-3">
        <img
          src={selectedUser.avatar || "/avatars/defaultUser.jpg"}
          alt={selectedUser.name}
          className="w-10 h-10 rounded-full"
        />
        Chat with {selectedUser.name}
      </h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-3 rounded-lg">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 my-1 rounded-lg ${
              msg.sender === user._id
                ? "bg-slate-300 text-white self-end"
                : "bg-neutral-300 text-black self-start"
            }`}
          >
            <strong>
              {msg.sender === user._id ? "You" : selectedUser.name}:
            </strong>
            <br />
            {msg.message}
            {msg.file && (
              <div className="mt-2">
                {/\.(jpeg|jpg|png|gif)$/i.test(msg.file) ? (
                  <img
                    src={msg.file}
                    alt="Sent file"
                    className="max-w-[200px] max-h-[200px] rounded-lg"
                  />
                ) : (
                  <a
                    href={msg.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    📎 View File
                  </a>
                )}
              </div>
            )}


          </div>
        ))}
      </div>

      {/* Emoji Picker (Now positioned in chat area) */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-50">
          <Picker onEmojiClick={(emojiObject) => {
            setMessage((prev) => prev + emojiObject.emoji);
            setShowEmojiPicker(false);
          }} />
        </div>
      )}

      {/* Chat Input & Controls */}
      <div className="flex items-center gap-2 p-2 border-t mt-3">
        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-xl"
        >
          😊
        </button>
{/* File Upload */}
  <input type="file" onChange={handleFileChange} className="hidden" id="file-input" />
  <label htmlFor="file-input" className="p-2 text-xl cursor-pointer">
    ➕
  </label>

  {/* File Preview */}
  {selectedFile && (
    <div className="absolute bottom-14 left-10 bg-gray-200 p-2 rounded-lg flex items-center gap-2 shadow-md w-28">
      {selectedFile.type.startsWith("image/") ? (
        <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-10 h-10 rounded-md" />
      ) : (
        <span className="text-sm text-gray-800">{selectedFile.name}</span>
      )}
      <button onClick={removeSelectedFile} className="text-red-500 font-bold pl-4">
        ✖
      </button>
    </div>
  )}

        {/* Message Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 border rounded-lg"
          placeholder="Type a message..."
        />

        {/* Send Button */}
        <button onClick={sendMessage} className="p-2 bg-zinc-600 text-white rounded-lg">
          Send
        </button>
      </div>
    </>
  ) : (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-3xl font-bold">Welcome, {user?.name}!</h2>
      <p>Select a user to start chatting.</p>
    </div>
  )}
</div>

        
    </div>
  );
};

export default Chat;
