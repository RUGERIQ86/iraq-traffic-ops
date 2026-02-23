import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const ChatComponent = ({ myUnitId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);

  // Generate a consistent neon color for each user
  const getUserColor = (userId) => {
    const colors = [
      '#00ff00', // Green
      '#00ffff', // Cyan
      '#ff00ff', // Magenta
      '#ffff00', // Yellow
      '#ff9900', // Orange
      '#ff0000', // Red
      '#0099ff', // Blue
      '#ccff00'  // Lime
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    // Auto-Destruct: Delete messages older than 10 minutes
    const cleanupOldMessages = async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('messages')
        .delete()
        .lt('created_at', tenMinutesAgo);
      
      if (error) console.warn("Chat cleanup warning (RLS might block delete):", error.message);
    };

    cleanupOldMessages();
    const cleanupInterval = setInterval(cleanupOldMessages, 1 * 60 * 1000); // Check every 1 minute

    // Load initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false }) // Get latest messages
        .limit(50);
      
      if (error) {
        console.error("Chat Error (Fetching):", error.message);
        // Silent fail or minimal alert to avoid spamming user
      } else {
        // 1. Sort by time ascending to process timeline
        let sortedData = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // 2. Check for GLOBAL CLEAR marker
        const lastClearIndex = sortedData.map(m => m.content).lastIndexOf(':::CHAT_CLEARED_GLOBAL:::');
        
        // 3. Slice messages if a clear marker exists (hide everything before it)
        if (lastClearIndex !== -1) {
            sortedData = sortedData.slice(lastClearIndex + 1);
        }

        // 4. Filter out messages cleared locally (legacy/fallback)
        const lastCleared = localStorage.getItem('chat_last_cleared');
        if (lastCleared) {
            sortedData = sortedData.filter(msg => new Date(msg.created_at) > new Date(lastCleared));
        }
        
        // Reverse to show oldest first (top) to newest (bottom)
        setMessages(sortedData);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.errors) {
            console.error("Chat Error (Realtime):", payload.errors);
            return;
        }
        
        // Handle GLOBAL CLEAR command
        if (payload.new.content === ':::CHAT_CLEARED_GLOBAL:::') {
            setMessages([]); // Clear chat for everyone online
            return;
        }

        setMessages(prev => [...prev, payload.new]);
        if (!isOpen) {
          setHasUnread(true);
        }
      })
      .subscribe((status, err) => {
        if (err) {
            console.error("Chat Subscription Error:", err);
            alert("Chat Error: Could not connect to real-time chat. Check Supabase connection and RLS.");
        }
      });

    return () => {
      clearInterval(cleanupInterval);
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !myUnitId) {
        if (!myUnitId) alert("Cannot send message: User ID is not set.");
        return;
    }

    const messageData = {
      unit_id: myUnitId,
      content: newMessage.trim(),
      color: getUserColor(myUnitId),
    };

    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      console.error('Error sending message:', error);
      alert(`Error sending message: ${error.message}. Check RLS policies.`);
    } else {
      setNewMessage('');
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("WARNING: CLEAR CHAT FOR ALL USERS?")) {
      // 1. Send GLOBAL CLEAR marker to database (hides history for everyone)
      await supabase.from('messages').insert([{
        unit_id: 'SYSTEM',
        content: ':::CHAT_CLEARED_GLOBAL:::',
        color: '#ff0000'
      }]);

      // 2. Clear locally immediately
      localStorage.setItem('chat_last_cleared', new Date().toISOString());
      setMessages([]);
      
      // 3. Try to delete from DB (cleanup)
      try {
          await supabase
            .from('messages')
            .delete()
            .neq('id', 0); 
      } catch (err) {
          console.warn("DB Clear failed (RLS restricted), but Global Marker sent.");
      }
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle-btn ${hasUnread ? 'unread-pulse' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '[ CLOSE ]' : `[ CHAT ${hasUnread ? '(!)' : ''} ]`}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-container">
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.8)'}}>
             <span style={{color: '#00ff00', fontSize: '12px'}}>SQUAD COMMS</span>
             <button 
               onClick={handleClearChat}
               style={{background: 'red', color: 'white', border: 'none', fontSize: '10px', padding: '2px 5px', cursor: 'pointer'}}
             >
               CLEAR ALL
             </button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.unit_id === myUnitId ? 'sent' : 'received'}`}
              >
                <div className="message-sender" style={{ color: msg.color || getUserColor(msg.unit_id) }}>
                  {msg.unit_id} <span style={{fontSize: '0.7em', opacity: 0.7}}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="message-content" dir="auto">
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="TYPE MESSAGE..."
              className="chat-input"
              dir="auto"
            />
            <button type="submit" className="chat-send-btn">SEND</button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatComponent;
