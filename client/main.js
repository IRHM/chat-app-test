/**
 * Global Vars
 */

// Elements
const messagesContainer = document.getElementById("messages");
const nameInput = document.getElementById("usernameInput");
const toConnectInput = document.getElementById("toConnectInput");
const msgInput = document.getElementById("messageInput");
var myid;

// Different types of operations
const Operations = Object.freeze({
  "message": 0,
  "clients": 1,
  "myid": 50,
  "candidate": 100
});

// Create websocket connection
const webSocket = new WebSocket("wss://192.168.0.11:8000/");

/**
 * Add a message to messages element locally
 * @param {*} msg Message to add
 */
function notice(msg) {
  messagesContainer.innerHTML += `
    <strong>${msg}</strong> <br>
  `;
}

/**
 * Notify user if websocket connection is opened
 */
webSocket.addEventListener('open', () => {
  if (WebSocket.OPEN) {  
    notice("Connected");
  }
});

/**
 * Notify user if websocket connection is closed/fails to open
 */
webSocket.addEventListener('close', (e) => {
  notice("Couldn't reach server");
});

/**
 * Display message to user once they recieve it
 */
webSocket.addEventListener('message', (e) => {
  var msg = JSON.parse(e.data);

  switch (msg.op) {
    case Operations.message:
      messagesContainer.innerHTML += `
        <strong>${msg.message.username}:</strong> ${msg.message.body} <br>
      `;
      break;
    case Operations.clients:
      document.getElementById("usersOnline").innerHTML = `
        Users online: ${msg.clients.amount}
      `;
      break;
    case Operations.myid:
      myid = msg.client.id;
      break;
  }
});

/**
 * Catch when user tries to submit form, then use input data to send a message to server
 */
document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();

  // Only go to send message if inputs aren't empty and webSocket is open
  if (
    nameInput.value != "" && 
    msgInput.value != "" && 
    webSocket.readyState == webSocket.OPEN
  ) {
    // Send message to server
    webSocket.send(JSON.stringify({
      op: Operations.message,
      message: {
        username: nameInput.value,
        body: msgInput.value
      }
    }));

    // Empty msgInput after sending message
    msgInput.value = "";
  }
});

/**
 * WebRTC part
 */

var config = {
  'iceServers': [
    {
      'urls': 'stun:192.168.0.11:3478'
    },
    {
      'urls': 'turn:192.168.0.11:3478',
      'username': 'user',
      'credential': 'pass'
    }
  ]
};

async function openConnection() {
  var media = await navigator.mediaDevices.getUserMedia({ audio: true });

  var pc = new RTCPeerConnection(config);

  for (const track of media.getTracks()) {
    pc.addTrack(track);
  }

  pc.onicecandidate = (event) => {
    console.log("Found an ice candidate");

    if (event.candidate) { 
      webSocket.send(JSON.stringify({
        op: Operations.candidate,
        candidate: {
          username: nameInput.value,
          candidate: event.candidate
        }
      }));
    }
  };

  console.log("Connection opened?");
}

document.getElementById("toConnectForm").addEventListener('submit', (e) => {
  e.preventDefault();

  webSocket.send(JSON.stringify({
    op: 101,
    CandidateOffer: {
      username: toConnectInput.value
    }
  }));
});

openConnection();
