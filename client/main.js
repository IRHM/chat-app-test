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
 * Send json message to websocket connection
 * @param {*} msg Message to send in json 
 */
function webSend(msg) {
  webSocket.send(JSON.stringify(msg));
}

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
    webSend({
      op: Operations.message,
      message: {
        username: nameInput.value,
        body: msgInput.value
      }
    });

    // Empty msgInput after sending message
    msgInput.value = "";
  }
});

/**
 * WebRTC
 */

// Peer connection config
var config = {
  'iceServers': [
    {
      'urls': 'turn:192.168.0.11:3478',
      'username': 'user',
      'credential': 'pass'
    }
  ]
};

// Wanted media
var mediaConstraints = {
  audio: true,
  video: false
};

// Create new peer connection
var peerconn = new RTCPeerConnection(config);

/**
 * Get media devices and add them to the connection
 */
navigator.mediaDevices.getUserMedia(mediaConstraints).then((m) => {
  // Play back local stream
  // document.getElementById("outputAudio").srcObject = m;

  m.getTracks().forEach(track => peerconn.addTrack(track, m));
});

peerconn.ontrack = (e) => {
  // Start playing recieved audio stream
  document.getElementById("recievedAudio").srcObject = e.streams[0];
};

/**
 * Once a candidate is found send it to the other client
 * @param {*} event 
 */
peerconn.onicecandidate = (event) => {
  console.log("Found an ice candidate");

  if (event.candidate) {
    webSend({
      op: Operations.candidate,
      candidate: {
        to: toConnectInput.value,
        candidate: event.candidate
      }
    });
  }
  else {
    console.log("All ice candidates sent");
  }
};

/**
 * Handle offer from candidate and create an answer
 * @param {*} offer 
 */
function handleCandidateOffer(offer) {
  console.log("Handling candidate offer");
  console.log(offer);

  peerconn.setRemoteDescription(new RTCSessionDescription(offer.offer));

  peerconn.createAnswer().then((answer) => {
    peerconn.setLocalDescription(answer);

    // Send response
    webSend({
      op: Operations.candidateResponse,
      candidateResponse: {
        Answer: true, // For now, just answer true instead of asking the user
        Offer: answer,
        OfferedBy: offer.by
      }
    });
  });
}

/**
 * Handle candidates response to offer - setRemoteDescription
 * @param {*} resp 
 */
function handleCandidateResponse(resp) {
  console.log("Handling candidates response");
  console.log(resp.offer);

  // if (resp.answer) {
    peerconn.setRemoteDescription(new RTCSessionDescription(resp.offer));
  // }
}

/**
 * Add ICE candidate
 * @param {*} candidate 
 */
function handleCandidate(candidate) {
  console.log("Adding ice candidate");
  console.log(candidate);

  peerconn.addIceCandidate(new RTCIceCandidate(candidate));
}

/**
 * Handle submit on toConnect form
 * Create offer and send it to client to connect to
 */
document.getElementById("toConnectForm").addEventListener('submit', (e) => {
  e.preventDefault();

  peerconn.createOffer().then((offer) => {
    console.log(offer);

    peerconn.setLocalDescription(offer);

    // Send offer to other client
    webSend({
      op: Operations.candidateOffer,
      CandidateOffer: {
        to: toConnectInput.value,
        by: myid.toString(),
        offer: offer
      }
    });
  });
});
