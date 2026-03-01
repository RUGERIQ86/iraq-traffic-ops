import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

const ChatComponent = ({ myUnitId, session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = session?.user?.email === 'ruger@1.com';
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);

  // التعديل 1: جعل وظيفة الألوان آمنة تماماً
  const getUserColor = (userId) => {
    if (!userId) return '#00ffff'; // لون افتراضي إذا كان المعرف غير موجود
    const colors = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff9900', '#ff0000', '#0099ff', '#ccff00'];
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
    const cleanupOldMessages = async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase.from('messages').delete().lt('created_at', tenMinutesAgo);
    };

    cleanupOldMessages();
    const cleanupInterval = setInterval(cleanupOldMessages, 60000);

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Chat Error:", error.message);
      } else if (data) { // التعديل 2: التأكد من وجود البيانات قبل ترتيبها
        let sortedData = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const lastClearIndex = sortedData.map(m => m.content).lastIndexOf(':::CHAT_CLEARED_GLOBAL:::');
        if (lastClearIndex !== -1) sortedData = sortedData.slice(lastClearIndex + 1);

        const lastCleared = localStorage.getItem('chat_last_cleared');
        if (lastCleared) {
            sortedData = sortedData.filter(msg => new Date(msg.created_at) > new Date(lastCleared));
        }
        setMessages(sortedData);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (!payload.new) return;
        
        if (payload.new.content === ':::CHAT_CLEARED_GLOBAL:::') {
            setMessages([]);
            return;
        }

        setMessages(prev => [...(prev || []), payload.new]);
        
        const { content, unit_id } = payload.new;
        if (content.includes('[DANGER]')) {
          toast.error(`DANGER [${unit_id}]: ${content.replace('[DANGER]', '')}`);
        } else if (!isOpen && unit_id !== myUnitId) {
          setHasUnread(true);
          toast(`NEW MESSAGE FROM ${unit_id}`, { icon: '💬' });
        }
      })
      .subscribe();

    return () => {
      clearInterval(cleanupInterval);
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !myUnitId) return;

    const { error } = await supabase.from('messages').insert([{
      unit_id: myUnitId,
      content: newMessage.trim(),
      color: getUserColor(myUnitId),
    }]);

    if (!error) setNewMessage('');
  };

  return (
    <>
      <button 
        className={`chat-toggle-btn ${hasUnread ? 'unread-pulse' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '[ CLOSE ]' : `[ CHAT ${hasUnread ? '(!)' : ''} ]`}
      </button>

      {isOpen && (
        <div className="chat-container">
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.8)'}}>
             <span style={{color: '#00ff00', fontSize: '12px'}}>SQUAD COMMS</span>
          </div>
          <div className="chat-messages">
            {/* التعديل 3: استخدام الاختياري ?. للتأكد من وجود المصفوفة */}
            {messages?.map((msg, index) => (
              <div key={index} className={`message ${msg.unit_id === myUnitId ? 'sent' : 'received'}`}>
                <div className="message-sender" style={{ color: msg.color || getUserColor(msg.unit_id) }}>
                  {msg.unit_id} <span style={{fontSize: '0.7em'}}>{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="message-content">{msg.content}</div>
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
            />
            <button type="submit" className="chat-send-btn">SEND</button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatComponent;