/**
 * Add a message to messages element locally
 * @param {*} msg Message to add
 */
function notice(msg) {
  document.getElementById("messages").innerHTML += `
    <strong>${msg}</strong> <br>
  `;
}

/**
 * Create websocket connection
 */
var webSocket = new WebSocket("wss://192.168.0.11:8000/");

/**
 * Notify user if websocket connection is opened
 */
webSocket.addEventListener('open', () => {
  if (WebSocket.OPEN) {  
    notice("Connected");
  }
});

/**
 * Notify user if websocket connection couldn't open
 */
webSocket.addEventListener('error', () => {
  if (WebSocket.CLOSED) {
    notice("Couldn't connect to server");
  }
});

/**
 * Display message to user once they recieve it
 */
webSocket.addEventListener('message', (e) => {
  var msg = JSON.parse(e.data);

  switch (msg.op) {
    case 0:
      document.getElementById("messages").innerHTML += `
        <strong>${msg.message.username}:</strong> ${msg.message.body} <br>
      `;
      break;
  }
});

/**
 * Catch when user tries to submit form, then use input data to send a message to server
 */
document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();

  webSocket.send(JSON.stringify({
    op: 0,
    message: {
      username: document.getElementById('usernameInput').value,
      body: document.getElementById('messageInput').value
    }
  }));
});
