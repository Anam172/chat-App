import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import moment from "moment";
import { FaPaperclip, FaTimes, FaPlus, FaCheck, FaCheckDouble } from "react-icons/fa";



const socket = io("http://localhost:5000");
window.socket = socket;

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
  const [usersStatus, setUsersStatus] = useState({});
  const [groups, setGroups] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  
  
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
        const usersRes = await axios.get("http://localhost:5000/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        let filteredUsers = usersRes.data.filter(
          (usr) => usr._id !== storedUser?._id
        );
  
        setUsers([storedUser, ...filteredUsers]);

         // Request user statuses after fetching users
      socket.emit("requestUserStatus");
      
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
  
    fetchUsers();
  }, []);
  
  useEffect(() => {
    if (!selectedUser || !user) return;
  
    const fetchMessages = async () => {
      const url = selectedUser.isGroup
        ? `http://localhost:5000/api/groups/${selectedUser._id}/messages`
        : `http://localhost:5000/api/chat/${user._id}/${selectedUser._id}`;
  
      try {
        const response = await axios.get(url);
        setMessages(response.data);
        console.log("Messages Loaded:", response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
  
    fetchMessages();
  }, [selectedUser, user]);
  
  
  
  const sendMessage = useCallback(async (e) => {
    e?.preventDefault();
    if (!message.trim() && !selectedFile) return;
    if (!user || !selectedUser) return;
  
    console.log("Sending Message:", { message, selectedFile, user, selectedUser });
  
    const token = localStorage.getItem("token");
  
    const tempMessage = {
      _id: Date.now().toString(),
      sender: user._id,
      receiver: selectedUser.isGroup ? null : selectedUser._id,
      group: selectedUser.isGroup ? selectedUser._id : null,
      message: message.trim(),
      file: selectedFile || null,
      timestamp: new Date(),
      status: "sent",
    };
  
    setMessages((prev) => [...prev, tempMessage]); 
  
    if (selectedUser.isGroup) {
      socket.emit("sendGroupMessage", tempMessage);
    } else {
      socket.emit("sendMessage", tempMessage);
    }
  
    try {
      let response;
  
      if (!selectedUser.isGroup) {
        response = await axios.post(
          "http://localhost:5000/api/chat/send",
          { sender: user._id, receiver: selectedUser._id, message: message.trim(), file: selectedFile },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      } else {
        response = await axios.post(
          `http://localhost:5000/api/groups/${selectedUser._id}/send`,
          { sender: user._id, groupId: selectedUser._id, message: message.trim(), file: selectedFile },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      }
  
      console.log("Message Sent Successfully:", response.data);
  
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempMessage._id ? response.data : msg))
      );
  
    } catch (err) {
      console.error("Error sending message:", err);
    }
  
    setMessage("");
    setSelectedFile(null);
  }, [message, selectedFile, user, selectedUser]);
  

  
  
  
  useEffect(() => {
    if (selectedUser && selectedUser.isGroup) {
      setMessages([]); 
    }
  }, [selectedUser]);
  
  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      console.log("Received Message:", newMessage);
      
      setMessages((prev) => {
        const isDuplicate = prev.some((msg) => msg._id === newMessage._id);
        return isDuplicate ? prev : [...prev, newMessage];
      });
    };
  
    socket.off("receiveMessage");
    socket.on("receiveMessage", handleNewMessage);
  
    return () => {
      socket.off("receiveMessage", handleNewMessage);
    };
  }, []);
  
  
  
  
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
  
        // Emit messageRead event for unread messages
        const unreadMessages = res.data.filter(
          (msg) => msg.receiver === user._id && msg.status !== "read"
        );
  
        if (unreadMessages.length > 0) {
          unreadMessages.forEach((msg) => {
            socket.emit("messageRead", { messageId: msg._id, senderId: msg.sender });
          });
  
          // Send one request to mark all as read
          axios.post(
            "http://localhost:5000/api/chat/markAsRead",
            { messageId: unreadMessages.map((msg) => msg._id) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
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
}, [messages]); 

  

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

useEffect(() => {
  socket.on("update-user-status", (allUsers) => {
    const updatedStatus = {};
    allUsers.forEach((usr) => {
      updatedStatus[usr._id] = {
        online: usr.isOnline,
        lastSeen: usr.lastSeen,
      };
    });
    setUsersStatus(updatedStatus);
  });

  socket.emit("requestUserStatus"); 

  return () => {
    socket.off("update-user-status");
  };
}, []);


useEffect(() => {
  const handleBeforeUnload = () => {
    if (user) {
      socket.emit("userDisconnected", user._id);
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [user]);


const getUserStatus = (userId) => {
  if (!usersStatus[userId]) return "Offline";

  return usersStatus[userId].online
    ? "Online"
    : usersStatus[userId].lastSeen
    ? `Last seen at ${moment(usersStatus[userId].lastSeen).format("hh:mm A")}`
    : "Offline";
};



// Fetching group messages

useEffect(() => {
  if (!user) return;

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/groups/${user._id}`);
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  fetchGroups();
}, [user]);


// Join Group Rooms 
useEffect(() => {
  if (!user) return;

  groups.forEach((group) => {
    socket.emit("joinGroup", group._id);
  });
}, [user, groups]);

useEffect(() => {
  socket.on("groupCreated", (newGroup) => {
    setGroups((prevGroups) => [...prevGroups, newGroup]); 
    socket.emit("joinGroup", newGroup._id); 
  });

  return () => {
    socket.off("groupCreated");
  };
}, []);


//Handle for Group Messages
useEffect(() => {
  socket.on("receiveGroupMessage", (newMessage) => {
    console.log("New Group Message:", newMessage);
    setMessages((prevMessages) => [...prevMessages, newMessage]); 
  });

  return () => {
    socket.off("receiveGroupMessage");
  };
}, []);




const createGroup = async () => {
  if (!groupName || selectedGroupMembers.length < 2) {
    alert("A group must have a name and at least two members.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      "http://localhost:5000/api/groups",
      { name: groupName, members: selectedGroupMembers },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setShowCreateGroupModal(false);
    setGroupName("");
    setSelectedGroupMembers([]);

    // Emit an event to update UI for all users
    socket.emit("groupCreated", response.data);

  } catch (error) {
    console.error("Error creating group:", error);
  }
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
                    selectedUser?._id === usr._id ? "bg-gray-100" : "hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedUser(usr)}
                >
                  {/* User Avatar */}
                  <div className="relative">
                    <img
                      src={usr.avatar || "/avatars/defaultUser.jpg"}
                      alt={usr.name}
                      className="w-10 h-10 rounded-full border-2 border-zinc-600"
                    />
                    {/* Online/Offline Indicator */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                        usersStatus[usr._id]?.online
                          ? "bg-green-500 border-white"
                          : "bg-white border-gray-400"
                      }`}
                    ></span>
                  </div>

                  {/* Username & Status */}
                  <div>
                    <span className="text-lg">{usr.name} {usr._id === user?._id ? "(You)" : ""}</span>
                  </div>
                </li>
              ))}
           </ul>

        <h3 className="text-xl font-bold mb-4">Groups</h3>
        <ul className="space-y-2">
          {groups.map((group) => (
           <li
           key={group._id}
           className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition duration-200 ${
             selectedUser?._id === group._id ? "bg-gray-100" : "hover:bg-gray-200"
           }`}
           onClick={() => setSelectedUser({ ...group, isGroup: true })}
         >
           {/* Group Avatars */}
           <div className="relative w-10 h-10">
             {group.members.slice(0, 3).map((member, index) => (
               <img
                 key={index}
                 src={member.avatar || "/avatars/defaultUser.jpg"}
                 alt={member.name}
                 className="absolute w-6 h-6 rounded-full border-2 border-white"
                 style={{ left: index * 8, top: index * 8 }} // Stacks avatars
               />
             ))}
           </div>
           
           <div>
             <span className="text-lg font-semibold">{group.name}</span>
             <p className="text-xs text-gray-500">{group.members.map(m => m.name).join(", ")}</p>
           </div>
         </li>
         
          ))}
          <button
          onClick={() => setShowCreateGroupModal(true)}
          className="p-2 bg-zinc-500 text-white rounded-lg w-full text-center"
        >
          + Create Group
        </button>

        </ul>
        
        {showCreateGroupModal && (
          <div className=" inset-0 flex justify-center items-center bg-transparent bg-opacity-50 z-50">
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-bold mb-2">Create Group</h2>
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border rounded-lg mb-2"
              />
              <div className="w-full p-2 border rounded-lg max-h-40 overflow-auto">
          {users.map((usr) => (
            <label key={usr._id} className="flex items-center space-x-2 p-1 cursor-pointer">
              <input
                type="checkbox"
                value={usr._id}
                className="accent-purple-500"
                checked={selectedGroupMembers.includes(usr._id)}
                onChange={(e) => {
                  const userId = e.target.value;
                  setSelectedGroupMembers((prev) =>
                    prev.includes(userId)
                      ? prev.filter((id) => id !== userId) // Remove if already selected
                      : [...prev, userId] // Add if not selected
                  );
                }}
              />
              <span>{usr.name}</span>
            </label>
          ))}
        </div>

            <div className="flex justify-between mt-3">
                    <button onClick={createGroup} className="bg-purple-300 text-white px-3 py-2 rounded-lg">
                      Create
                    </button>
                    <button onClick={() => setShowCreateGroupModal(false)} className="bg-blue-200 text-white px-3 py-2 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}



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
        {/* Group or User Avatar */}
          {selectedUser.isGroup ? (
            selectedUser.avatar ? (
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="w-12 h-12 rounded-full border-2 border-white"
              />
            ) : (
              <div className="relative w-12 h-12">
                {selectedUser.members.slice(0, 3).map((member, index) => (
                  <img
                    key={index}
                    src={member.avatar || "/avatars/defaultUser.jpg"}
                    alt={member.name}
                    className="absolute w-6 h-6 rounded-full border-2 border-white"
                    style={{ left: index * 10, top: index * 10 }}
                  />
                ))}
              </div>
            )
          ) : (
            <img
              src={selectedUser.avatar || "/avatars/defaultUser.jpg"}
              alt={selectedUser.name}
              className="w-10 h-10 rounded-full border-2 border-zinc-400"
            />
          )}


        <div className="flex flex-col">
        <h2 className="text-xl font-bold">{selectedUser.name}</h2>
          {selectedUser.isGroup ? (
            <p className="text-sm text-gray-500">Members: {selectedUser.members.map(m => m.name).join(", ")}</p>
          ) : (
            <span className="text-sm text-gray-500">{getUserStatus(selectedUser._id)}</span>
          )}
       </div>
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
                <strong>
                  {msg.sender === user._id ? "You" : msg.sender.name}
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
          <div className="absolute bottom-14 left-10 bg-gray-200 p-2 rounded-lg flex items-center gap-2 shadow-md w-36">
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
         onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); 
            sendMessage();
          }
          {/* Typing Indicator */}
          {isTyping && <p className="text-gray-500 italic mt-2">Typing...</p>}
        }}
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
