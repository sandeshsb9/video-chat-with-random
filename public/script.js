const socket = io(); // Connect to the server
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");
const nextBtn = document.getElementById("next");
const reportBtn = document.getElementById("report");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startVideoBtn = document.getElementById("startVideo");
const stopVideoBtn = document.getElementById("stopVideo");
const interestInput = document.getElementById("interest");
const searchUserBtn = document.getElementById("searchUser");
const onlineCountSpan = document.getElementById("onlineCount");
const notification = document.getElementById("notification"); // Notification div

let localStream, peerConnection, interest;

// Handle search user
searchUserBtn.onclick = () => {
  interest = interestInput.value.trim();
  if (interest) {
    socket.emit('find-user', interest);
    document.getElementById('interest-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
  } else {
    alert("Please enter an interest to start chatting!");
  }
};

// Send message on click
sendBtn.onclick = sendMessage;

// Send message on Enter key press
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
    event.preventDefault(); // Prevent form submission (if inside a form)
  }
});

function sendMessage() {
  const message = messageInput.value;
  if (message) {
    socket.emit('message', message);
    appendMessage("You", message);
    messageInput.value = "";
  }
}

// Display received message
socket.on('message', message => {
  appendMessage("Stranger", message);
  showNotification("New message received from Stranger: " + message); // Show notification
});

function appendMessage(sender, message) {
  const div = document.createElement("div");
  div.textContent = `${sender}: ${message}`;
  messagesDiv.appendChild(div);
}

// Function to show notification
function showNotification(message) {
  notification.textContent = message;
  notification.style.display = 'block'; // Show notification
  setTimeout(() => {
    notification.style.display = 'none'; // Hide after 5 seconds
  }, 5000);
}

// Connect to next stranger
nextBtn.onclick = () => {
  stopMedia();
  socket.emit('next');
  appendMessage("System", "You have disconnected. Searching for a new connection...");
  messagesDiv.innerHTML = ""; // Clear chat history
};

// Report feature (stub)
reportBtn.onclick = () => {
  appendMessage("System", "User reported. We will review your report.");
};

// WebRTC setup for video
startVideoBtn.onclick = async () => {
  if (!peerConnection) createPeerConnection();  // Ensure peerConnection is initialized
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
};

// Stop video
stopVideoBtn.onclick = () => {
  stopMedia();
};

// Helper function to stop all media
function stopMedia() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;  // Reset the connection for the next chat
  }
}

// WebRTC signaling
socket.on('offer', async offer => {
  if (!peerConnection) createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async answer => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Handle sudden disconnection and display message in the chat
socket.on('disconnected', () => {
  appendMessage("System", "The stranger has disconnected.");
  stopMedia(); // Clean up the video and WebRTC connection
});

// Update online users count
socket.on('update-online-users', count => {
  onlineCountSpan.textContent = count;
});

// Function to create a new peer connection
function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };
}
