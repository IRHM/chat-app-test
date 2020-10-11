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
  document.getElementById("messages").insertAdjacentHTML('beforebegin', "<div id=\"message\"><strong>".concat(msg.username, ":</strong> ").concat(msg.message, " </div><br>"));
  scrollBtm.scrollIntoView();
});