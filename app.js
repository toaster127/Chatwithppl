let ws;
let username = "";
let roomCode = "";

// DOM Elements
const setupScreen = document.getElementById("setup-screen");
const chatScreen = document.getElementById("chat-screen");
const nameInput = document.getElementById("name-input");
const roomInput = document.getElementById("room-input");
const generateBtn = document.getElementById("generate-btn");
const joinBtn = document.getElementById("join-btn");
const copyLinkBtn = document.getElementById("copy-link-btn");
const messagesDiv = document.getElementById("messages");
const statusEl = document.getElementById("connection-status");
const chatForm = document.getElementById("chat-form");
const msgInput = document.getElementById("msg-input");

// Easy-to-read word list for generating fun room codes
const words = ["tiger", "pixel", "comet", "neon", "orbit", "spark", "frost", "lunar", "echo", "nova"];

function generateRoomCode() {
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word1}-${word2}-${num}`;
}

// On Page Load: Check if URL already has a ?room= parameter
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const sharedRoom = params.get("room");

  if (sharedRoom) {
    roomInput.value = sharedRoom;
  } else {
    roomInput.value = generateRoomCode();
  }
});

// Roll a new random room code
generateBtn.addEventListener("click", () => {
  roomInput.value = generateRoomCode();
});

// Join the chat room
joinBtn.addEventListener("click", () => {
  username = nameInput.value.trim();
  roomCode = roomInput.value.trim().toLowerCase().replace(/\s+/g, "-");

  if (!username) {
    nameInput.focus();
    alert("Enter your name first!");
    return;
  }

  if (!roomCode) {
    roomCode = generateRoomCode();
    roomInput.value = roomCode;
  }

  // Update the browser URL silently so it matches the room
  const newUrl = `${window.location.pathname}?room=${encodeURIComponent(roomCode)}`;
  window.history.replaceState({}, "", newUrl);

  setupScreen.style.display = "none";
  chatScreen.style.display = "flex";
  msgInput.focus();

  connectWebSocket();
});

// Copy full invite link to clipboard
copyLinkBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = "Copied! ✓";
    setTimeout(() => (copyLinkBtn.textContent = originalText), 2000);
  });
});

// Connect to free WebSocket relay
function connectWebSocket() {
  ws = new WebSocket("wss://socketsbay.com/wss/v2/1/demo/");

  ws.onopen = () => {
    statusEl.textContent = `Room: ${roomCode}`;
    ws.send(JSON.stringify({
      room: roomCode,
      type: "system",
      text: `${username} joined the room`
    }));
    appendMessage("System", `You joined #${roomCode}`, false, true);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.room !== roomCode) return;

      if (data.type === "system") {
        appendMessage("System", data.text, false, true);
      } else {
        appendMessage(data.sender, data.text, data.sender === username, false);
      }
    } catch (e) {
      // Ignore non-JSON relay noise
    }
  };

  ws.onclose = () => {
    statusEl.textContent = "Disconnected (Refresh to rejoin)";
    statusEl.style.color = "#f85149";
  };
}

// Send a chat message
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    room: roomCode,
    type: "chat",
    sender: username,
    text: text
  }));

  appendMessage(username, text, true, false);
  msgInput.value = "";
});

// Render message bubble safely
function appendMessage(sender, text, isMine, isSystem) {
  const msgEl = document.createElement("div");

  if (isSystem) {
    msgEl.className = "msg system";
    msgEl.textContent = text;
  } else {
    msgEl.className = `msg ${isMine ? "mine" : ""}`;

    const senderEl = document.createElement("span");
    senderEl.className = "sender";
    senderEl.textContent = sender;

    const textEl = document.createElement("div");
    textEl.textContent = text;

    msgEl.appendChild(senderEl);
    msgEl.appendChild(textEl);
  }

  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
