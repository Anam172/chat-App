import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import moment from "moment";
import { FaPaperclip, FaTimes, FaPlus, FaCheck, FaCheckDouble } from "react-icons/fa";



const socket = io("http://localhost:5000");

const Chat = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);




  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
    }


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
    if (!user || !selectedUser) return;
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found, authentication required.");
      return;
    }
    
    axios.get(`http://localhost:5000/api/chat/${user._id}/${selectedUser._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => setMessages(res.data))
    .catch((err) => console.error("Error fetching chat history:", err));
  }, [selectedUser, user]);
  
  
  
  useEffect(() => {
    socket.on("receiveMessage", (newMessage) => {
      console.log("Received Message:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
    });
  
    return () => {
      socket.off("receiveMessage");
    };
  }, []);
  
  

  const sendMessage = useCallback(async () => {
    if (!message.trim() && !selectedFile) return;
  
    console.log("Sending Message:", { message, selectedFile });
  
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("sender", user._id);
    formData.append("receiver", selectedUser._id);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    formData.append("message", message.trim());
    formData.append("timestamp", new Date().toISOString());
  
    try {
      const response = await axios.post("http://localhost:5000/api/chat/send", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
  
      console.log("Message Sent:", response.data);
      
      socket.emit("sendMessage", response.data);
      setMessages((prev) => [...prev, response.data]);
      setMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
      
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }, [message, selectedFile, user, selectedUser]);
  
  useEffect(() => {
    socket.on("userTyping", ({ senderId }) => {
      if (selectedUser?._id === senderId) {
        setIsTyping(true);
      }
    });
  
    socket.on("userStoppedTyping", ({ senderId }) => {
      if (selectedUser?._id === senderId) {
        setIsTyping(false);
      }
    });
  
    return () => {
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [selectedUser]);
  
  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleTyping = useCallback(() => {
    if (!selectedUser) return;
  
    console.log("Typing event sent to", selectedUser._id);
    socket.emit("typing", { senderId: user._id, receiverId: selectedUser._id });
  
    // Clear previous timeout if exists
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  
    // Set new timeout to stop typing event after 2 seconds
    typingTimeout.current = setTimeout(() => {
      console.log("Stopped typing event sent to", selectedUser._id);
      socket.emit("stopTyping", { senderId: user._id, receiverId: selectedUser._id });
    }, 2000);
  }, [user, selectedUser]);
  
  
  
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };
  
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  useEffect(() => {
    if (!selectedUser || !user) return;
  
    const token = localStorage.getItem("token");
    axios
      .get(`http://localhost:5000/api/chat/${user._id}/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMessages(res.data);
  
        // Mark unread messages as read
        res.data.forEach((msg) => {
          if (msg.receiver === user._id && msg.status !== "read") {
            socket.emit("messageRead", { messageId: msg._id, senderId: msg.sender });
  
            axios.post(
              "http://localhost:5000/api/chat/markAsRead",
              { messageId: msg._id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        });
      })
      .catch((err) => console.error("Error fetching chat history:", err));
  }, [selectedUser, user]);
  

  useEffect(() => {
    socket.on("updateMessageStatus", ({ messageId, status }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        )
      );
    });
  
    return () => {
      socket.off("updateMessageStatus");
    };
  }, []);
  

// Group messages by day
const groupedMessages = useMemo(() => {
  const formatDate = (date) => {
    const today = moment().startOf("day");
    const messageDate = moment(date).startOf("day");

    if (messageDate.isSame(today, "day")) return "Today";
    if (messageDate.isSame(today.subtract(1, "day"), "day")) return "Yesterday";
    return messageDate.format("dddd, MMM D");
  };

  return messages.reduce((acc, msg) => {
    const dateKey = formatDate(msg.timestamp);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});
}, [messages]);


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
                selectedUser?._id === usr._id ? "bg-gray-100" : "hover:bg-gray-200"
              }`}
              onClick={() => setSelectedUser(usr)}
            >
              <img
                src={usr.avatar || "/avatars/defaultUser.jpg"}
                alt={usr.name}
                className="w-10 h-10 rounded-full border-2 border-zinc-600"
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
              className="w-12 h-12 rounded-full border-2 border-zinc-600"
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
          className="w-10 h-10 rounded-full border-2 border-zinc-400"
        />
        Chat with {selectedUser.name}
      </h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-3 rounded-lg flex flex-col">
  {Object.entries(groupedMessages).map(([date, msgs], index) => (
    <div key={index}>
      <div className="text-center text-gray-500 font-semibold my-2">{date}</div>
      {msgs.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 my-1 rounded-lg max-w-[30%] relative ${
                  msg.sender === user._id
                    ? "bg-slate-300 text-white ml-auto"
                    : "bg-neutral-300 text-black mr-auto"
                }`}
              >
                <strong>{msg.sender === user._id ? "You" : selectedUser.name}</strong>
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
                        className="text-zinc-500 underline"
                      >
                        <FaPaperclip className="mr-1 text-black" />View File
                      </a>
                    )}
                  </div>
                )}
                {/* Correct timestamp position */}
                <span className="flex flex-row justify-end items-center text-xs text-gray-600 mt-1">
                  {msg.timestamp ? moment(msg.timestamp).format("hh:mm A") : "Time not available"}

                  {msg.sender === user._id && (
                    <span className="ml-2 flex items-center">
                      {msg.status === "read" ? (
                        <FaCheckDouble className="text-blue-600" />
                      ) : msg.status === "delivered" ? (
                        <FaCheckDouble className="text-gray-600" />
                      ) : (
                        <FaCheck className="text-gray-600" />
                      )}
                    </span>
                  )}
                </span>
              </div>
            ))}
               
          {/* Typing Indicator */}
          {isTyping && <p className="text-gray-500 italic mt-2">Typing...</p>}
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
        {/* File Upload */}
        <input type="file" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="file-input" />
        <label htmlFor="file-input" className="p-2 text-xl cursor-pointer">
        <FaPlus className="mr-1" />
        </label>

        {/* File Preview */}
        {selectedFile && (
          <div className="absolute bottom-14 left-10 bg-gray-200 p-2 rounded-lg flex items-center gap-2 shadow-md w-28">
            {selectedFile.type.startsWith("image/") ? (
              <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-10 h-10 rounded-md" />
            ) : (
              <span className="text-sm text-gray-800">{selectedFile.name}</span>
            )}
            <button onClick={removeSelectedFile} className="text-red-700 font-bold pl-4">
            <FaTimes className="mr-1" />
            </button>
          </div>
        )}

         {/* Emoji Button */}
         <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-xl"
        >
          😊
        </button>

        {/* Message Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => { setMessage(e.target.value)
          handleTyping();
          }
         }
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
      <img src="/Message.gif" 
       alt="Welcome Gif" />
    </div>
  )}
</div>

        
    </div>
  );
};

export default Chat;
