import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage } from "./lib/gemini";
import "./App.css";

const LOCAL_STORAGE_KEY = "gemini_chat_history";

/**
 * Helper to split Gemini's thinking blocks (<thought>...</thought> or ```thinking)
 * from the final answer text.
 */
function parseResponseText(text) {
  if (!text) return { thinking: null, answer: "" };

  // Match <thought>...</thought> blocks
  const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    const thinking = thoughtMatch[1].trim();
    const answer = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
    return { thinking, answer };
  }

  // Match ```thinking ... ``` code fence blocks
  const codeFenceMatch = text.match(/```thinking\n([\s\S]*?)```/i);
  if (codeFenceMatch) {
    const thinking = codeFenceMatch[1].trim();
    const answer = text.replace(/```thinking\n[\s\S]*?```/gi, "").trim();
    return { thinking, answer };
  }

  return { thinking: null, answer: text };
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    const sdkHistory = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(sdkHistory, userMessage);
      setMessages((prev) => [...prev, { role: "model", text: responseText }]);
    } catch (err) {
      console.error("Gemini API Error:", err);
      setError("Failed to fetch response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      setMessages([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Google Gemini Chat</h1>
        {messages.length > 0 && (
          <button onClick={handleClearHistory} className="clear-btn">
            Clear History
          </button>
        )}
      </header>

      <main className="chat-window">
        {messages.length === 0 ? (
          <p className="empty-chat">Start a conversation!</p>
        ) : (
          messages.map((msg, idx) => {
            const { thinking, answer } = parseResponseText(msg.text);

            return (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <span className="role-label">
                  {msg.role === "user" ? "You" : "Assistant"}
                </span>

                {/* Render muted Gray Thinking Box if present */}
                {msg.role === "model" && thinking && (
                  <details className="thinking-box" open>
                    <summary className="thinking-header">
                      Thinking Process
                    </summary>
                    <div className="thinking-content">
                      <ReactMarkdown>{thinking}</ReactMarkdown>
                    </div>
                  </details>
                )}

                {/* Render Main Black Response Text */}
                <div className="main-answer">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="message-bubble model loading">
            <span className="role-label">Assistant</span>
            <div className="thinking-indicator">Thinking...</div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        <div ref={chatBottomRef} />
      </main>

      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}