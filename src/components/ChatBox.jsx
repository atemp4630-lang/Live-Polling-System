import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { chatAPI, usersAPI } from "../utils/api";
import { BsChatDots } from "react-icons/bs";
import msg from "../assets/msg.png";

const ChatBox = () => {
  const { user } = useAuth();
  const { on, off, emit } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchParticipants();
    }

    // Socket listeners
    const handleNewMessage = (messageData) => {
      setMessages(prev => [...prev, messageData]);
    };

    const handleParticipantsUpdate = (data) => {
      setParticipants(data.participants);
    };

    const handleUserKicked = (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
    };

    on('new_message', handleNewMessage);
    on('participants_update', handleParticipantsUpdate);
    on('user_kicked', handleUserKicked);

    return () => {
      off('new_message', handleNewMessage);
      off('participants_update', handleParticipantsUpdate);
      off('user_kicked', handleUserKicked);
    };
  }, [user, on, off]);

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages();
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await usersAPI.getParticipants();
      setParticipants(response.data.participants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      emit('send_message', {
        content: newMessage.trim(),
        messageType: 'text'
      });
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKickOut = async (userId) => {
    if (user?.role !== 'teacher') return;
    
    try {
      emit('kick_user', { userId });
    } catch (error) {
      console.error('Error kicking user:', error);
    }
  };

  const handleChatIconClick = () => {
    setIsOpen(!isOpen);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Icon Button */}
      <button
        onClick={handleChatIconClick}
        className="fixed bottom-4 right-4 z-45 bg-[#5A66D1] p-4 rounded-full shadow-lg text-white cursor-pointer"
        title="Click to open, double-click to close"
      >
        <img src={msg} className="w-5 h-5" />
      </button>

      {/* Chat Box */}
      {isOpen && (
        <div className="fixed bottom-20 sora text-sm right-4 w-[429px] h-[477px] rounded-sm shadow-lg border border-gray-300 bg-white z-50 overflow-hidden flex flex-col">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-300 justify-start gap-x-4 pl-4">
            <button
              onClick={() => setActiveTab("chat")}
              className={`relative px-4 py-2 font-semibold transition-all duration-200 ${
                activeTab === "chat"
                  ? "text-black border-b-2 border-[#8F64E1]"
                  : "text-gray-500 border-b-2 border-transparent"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`relative px-4 py-2 font-semibold transition-all duration-200 ${
                activeTab === "participants"
                  ? "text-black border-b-2 border-[#8F64E1]"
                  : "text-gray-500 border-b-2 border-transparent"
              }`}
            >
              Participants ({participants.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "chat" && (
              <>
                {/* Messages Container */}
                <div className="flex-1 p-4 space-y-4 bg-white overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`${message.senderRole === 'teacher' ? 'text-right' : 'text-left'}`}
                      >
                        <p className={`text-sm font-semibold ${
                          message.senderRole === 'teacher' ? 'text-black' : 'text-purple-800'
                        }`}>
                          {message.senderName}
                        </p>
                        <div className={`px-3 py-2 mt-1 rounded-lg w-fit max-w-[70%] ${
                          message.senderRole === 'teacher' 
                            ? 'bg-[#8F64E1] text-white ml-auto' 
                            : 'bg-black text-white mr-auto'
                        }`}>
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8F64E1]"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="px-4 py-2 bg-[#8F64E1] text-white rounded-md hover:bg-[#7048C6] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              </>
            )}

            {activeTab === "participants" && (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex justify-between text-[#726F6F] px-3 mb-4">
                  <span>Name</span>
                  {user?.role === 'teacher' && <span>Action</span>}
                </div>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No participants found
                    </div>
                  ) : (
                    participants.map((participant) => (
                      <div key={participant.id} className="flex justify-between items-center py-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            participant.role === 'teacher' ? 'bg-green-500' : 'bg-blue-500'
                          }`}></span>
                          <span className="text-black">
                            {participant.name} 
                            {participant.role === 'teacher' && ' (Teacher)'}
                          </span>
                        </div>
                        {user?.role === 'teacher' && participant.role === 'student' && (
                          <button
                            onClick={() => handleKickOut(participant.id)}
                            className="text-[#1D68BD] px-3 py-1 underline cursor-pointer hover:text-red-600 text-xs"
                          >
                            Kick out
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBox;