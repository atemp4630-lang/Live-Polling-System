import { useEffect, useRef, useState } from "react";
import { socketManager } from "../utils/socket";

export const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket reference
    socketRef.current = socketManager.socket;

    // Set initial connection status
    setConnected(socketManager.socket?.connected || false);

    // Track connection status changes
    const handleConnect = () => {
      console.log(
        "Socket connected in useSocket hook, ID:",
        socketManager.socket?.id
      );
      setConnected(true);
      socketRef.current = socketManager.socket;
    };

    const handleDisconnect = (reason) => {
      console.log("Socket disconnected in useSocket hook, reason:", reason);
      setConnected(false);
    };

    // Add event listeners
    if (socketManager.socket) {
      socketManager.socket.on("connect", handleConnect);
      socketManager.socket.on("disconnect", handleDisconnect);

      // Check current status
      if (socketManager.socket.connected) {
        handleConnect();
      }
    }
  }, [connected]);

  const emit = (event, data) => {
    if (!socketManager.socket?.connected) {
      console.warn(`Socket not connected, cannot emit ${event}`);
      return false;
    }
    socketManager.emit(event, data);
    return true;
  };

  const on = (event, callback) => {
    socketManager.on(event, callback);
  };

  const off = (event, callback) => {
    socketManager.off(event, callback);
  };

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected,
  };
};

if (socketManager.socket) {
  socketManager.socket.off("connect", handleConnect);
  socketManager.socket.off("disconnect", handleDisconnect);
}
export default useSocket;
