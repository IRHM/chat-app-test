package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// Operation - Type of operation being performed
type Operation struct {
	Operation int `json:"op"`

	Message *Message `json:"message,omitempty"`
	Clients *Clients `json:"clients,omitempty"`
}

// Message - Text message
type Message struct {
	Username string `json:"username"`
	Body     string `json:"body"`
}

// Clients - Information on all clients
type Clients struct {
	Amount int `json:"amount"`
}

var clients = make(map[*websocket.Conn]bool) // Connected clients
var broadcast = make(chan Operation)         // Broadcast channel
var upgrader = websocket.Upgrader{}          // Connection upgrader

func startMessagesWebSocket() {
	// Configure websocket route
	http.HandleFunc("/", handleConnections)

	// Start listening for incoming chat messages
	go handleMessages()

	// Start the server
	log.Println("Started websocket server on port 8000")
	err := http.ListenAndServeTLS(":8000", "server/.crt/cert.pem", "server/.crt/key.pem", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Allow every origin
	upgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}

	// Upgrade initial GET request to a websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Close the connection when the function returns
	defer ws.Close()

	// Register new client
	manageClient(true, ws)

	for {
		var req Operation

		// Read in a new message as JSON and map it to a Message object
		err := ws.ReadJSON(&req)
		if err != nil {
			log.Printf("notice: %v", err)
			manageClient(false, ws)
			break
		}

		// Handle different types of requests from client
		switch req.Operation {
		case 0:
			// Send message to broadcast channel
			broadcast <- req
		}
	}
}

func handleMessages() {
	for {
		// Grab the next message from the broadcast channel
		msg := <-broadcast

		// Send it out to every client that is currently connected
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("error: %v", err)
				client.Close()
				manageClient(false, client)
			}
		}
	}
}

func manageClient(add bool, ws *websocket.Conn) {
	if add {
		clients[ws] = true
	} else {
		delete(clients, ws)
	}

	broadcast <- Operation{
		Operation: 1,
		Clients: &Clients{
			Amount: len(clients),
		},
	}
}
