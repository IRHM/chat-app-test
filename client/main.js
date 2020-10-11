/**
 * Add a message to messages element locally
 * @param {*} msg Message to add
 */
function notice(msg) {
  document.getElementById("messages").innerHTML += `
    <strong>${msg}</strong> <br>
  `;
}

var webSocket = new WebSocket("wss://192.168.0.11:8000/");

webSocket.addEventListener('open', (e) => {
  if (WebSocket.OPEN) {  
    notice("Connected");
  }
});

webSocket.addEventListener('error', (e) => {
  if (WebSocket.CLOSED) {
    notice("Couldn't connect to server");
  }
});

webSocket.addEventListener('message', (e) => {
  var msg = JSON.parse(e.data);

  document.getElementById("messages").innerHTML += `
    <strong>${msg.username}:</strong> ${msg.body} <br>
  `;
});

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

