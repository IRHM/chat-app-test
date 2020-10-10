"use strict";

var webSocket = new WebSocket("wss://192.168.0.11:8000/");
document.getElementById("messageForm").addEventListener("submit", function (e) {
  e.preventDefault();
  webSocket.send(JSON.stringify({
    username: document.getElementById('usernameInput').value,
    message: document.getElementById('messageInput').value
  }));
});
webSocket.addEventListener('message', function (e) {
  var msg = JSON.parse(e.data);
  document.getElementById("messages").innerHTML += "\n    <strong>".concat(msg.username, ":</strong> ").concat(msg.message, " <br>\n  ");
  dummy.scrollIntoView();
});