var webSocket = new WebSocket("wss://192.168.0.11:8000/");

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

webSocket.addEventListener('message', function(e) {
  var msg = JSON.parse(e.data);

  document.getElementById("messages").innerHTML += `
    <strong>${msg.username}:</strong> ${msg.body} <br>
  `;
});
