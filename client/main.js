"use strict";

const webSocket = new WebSocket("wss://192.168.0.11:8000/");

document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();

  webSocket.send(JSON.stringify({
    username: document.getElementById('usernameInput').value,
    message: document.getElementById('messageInput').value
  }));
});

webSocket.addEventListener('message', function(e) {
  var msg = JSON.parse(e.data);
  let msgEl = document.getElementById("messages");

  msgEl.insertAdjacentHTML('beforeend', `<div id="message"><strong>${msg.username}:</strong> ${msg.message} </div><br>`);
  msgEl.scrollTop = msgEl.scrollHeight;
});
