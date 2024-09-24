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
sendBtn.onclick = () => {
  const message = messageInput.value;
  if (message) {
    socket.emit('message', message);
    appendMessage("You", message);
    messageInput.value = "";
  }
};

// Display received message
socket.on('message', message => {
  appendMessage("Stranger", message);
});

function appendMessage(sender, message) {
  const div = document.createElement("div");
  div.textContent = `${sender}: ${message}`;
  messagesDiv.appendChild(div);
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
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };

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
}

// WebRTC signaling
socket.on('offer', async offer => {
  peerConnection = new RTCPeerConnection();
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

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
  remoteVideo.srcObject = null; // Remove the video stream
});

// Update online users count
socket.on('update-online-users', count => {
  onlineCountSpan.textContent = count;
});
