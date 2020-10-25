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
  "message": 1,
  "clients": 2,
  "myid": 50,
  "candidate": 100,
  "candidateOffer": 101,
  "candidateResponse": 102
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

  console.log(msg.op);

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
      document.getElementById("usernameLabel").innerText = `Username (your id: ${myid}):`;
      break;
    case Operations.candidate:
      handleCandidate(msg.candidate.candidate);
      break;
    case Operations.candidateOffer:
      handleCandidateOffer(msg.candidateOffer);
      break;
    case Operations.candidateResponse:
      handleCandidateResponse(msg.candidateResponse);
      break;
  }
});

/**
 * Catch when user tries to submit message form, and send input data to server
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
      'urls': 'stun:192.168.0.11:3478',
      'username': 'user',
      'credential': 'pass'
    },
    {
      'urls': 'turn:192.168.0.11:3478',
      'username': 'user',
      'credential': 'pass'
    }
  ]
};

// Create new peer connection
var peerconn = new RTCPeerConnection(config);

// Get audio device and add to connection
var media = navigator.mediaDevices.getUserMedia({ audio: true }).then((m) => {
  for (const track of m.getTracks()) {
    peerconn.addTrack(track);
  }
});

peerconn.ontrack = (e) => {
  console.log(e);
  // document.getElementById("remoteAudio").src = e.stream; 
}; 

peerconn.onicecandidate = (event) => {
  console.log("Found an ice candidate");

  if (event.candidate) {
    webSocket.send(JSON.stringify({
      op: Operations.candidate,
      candidate: {
        to: toConnectInput.value,
        candidate: event.candidate
      }
    }));
  }
  else {
    console.log("All ice candidates sent");
  }
};

function handleCandidateOffer(offer) {
  console.log("Handling candidate offer");
  console.log(offer);

  peerconn.setRemoteDescription(new RTCSessionDescription(offer.offer));

  peerconn.createAnswer().then((answer) => {
    peerconn.setLocalDescription(answer);

    // Send response
    webSocket.send(JSON.stringify({
      op: Operations.candidateResponse,
      candidateResponse: {
        Answer: true, // For now, just answer true instead of asking the user
        Offer: answer,
        OfferedBy: offer.by
      }
    }));
  });
}

function handleCandidateResponse(resp) {
  console.log("Handling candidates response");
  console.log(resp.offer);

  // if (resp.answer) {
    peerconn.setRemoteDescription(new RTCSessionDescription(resp.offer));
  // }
}

function handleCandidate(candidate) {
  console.log("Adding ice candidate");
  console.log(candidate);

  peerconn.addIceCandidate(new RTCIceCandidate(candidate));
}

document.getElementById("toConnectForm").addEventListener('submit', (e) => {
  e.preventDefault();

  peerconn.createOffer().then((offer) => {
    console.log(offer);

    peerconn.setLocalDescription(offer);

    // Send offer to other client
    webSocket.send(JSON.stringify({
      op: Operations.candidateOffer,
      CandidateOffer: {
        to: toConnectInput.value,
        by: myid.toString(),
        offer: offer
      }
    }));
  });
});
