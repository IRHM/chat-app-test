var webSocket = new WebSocket("ws://192.168.0.11:8000/");

document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();

  webSocket.send(JSON.stringify({
    username: document.getElementById('usernameInput').value,
    message: document.getElementById('messageInput').value
  }));
});

webSocket.addEventListener('message', function(e) {
  var msg = JSON.parse(e.data);

  document.getElementById("messages").innerHTML += `
    <strong>${msg.username}:</strong> ${msg.message} <br>
  `;
});
