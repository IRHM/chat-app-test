package main

import (
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

// Different operation types
const (
	MessageOperation        = 0
	ClientsOperation        = 1
	ClientOperation         = 50
	CandidateOperation      = 100
	CandidateOfferOperation = 101
)

// Operation - Type of operation being performed
type Operation struct {
	Operation int `json:"op"`

	Message        *Message        `json:"message,omitempty"`
	Client         *Client         `json:"client,omitempty"`
	Clients        *Clients        `json:"clients,omitempty"`
	Candidate      *Candidate      `json:"candidate,omitempty"`
	CandidateOffer *CandidateOffer `json:"candidateOffer,omitempty"`
}

// Message - Text message
type Message struct {
	Username string `json:"username"`
	Body     string `json:"body"`
}

// Client - Information about current client
type Client struct {
	ID   int             `json:"id"`
	WSID *websocket.Conn `json:"-"`
}

// Clients - Information on all clients
type Clients struct {
	Amount int `json:"amount"`
}

// Candidate -
type Candidate struct {
	Username  string `json:"username"`
	Candidate string `json:"candidate"`
}

// CandidateOffer -
type CandidateOffer struct {
	Username string `json:"username"`
}

var clients = make(map[int]Client)          // Connected clients
var broadcast = make(chan Operation)        // Broadcast channel
var privateBroadcast = make(chan Operation) // Private broadcast channel
var upgrader = websocket.Upgrader{}         // Connection upgrader

// Initialize the HTTPS server
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

// Handle new connections
// Requests are upgraded to a websocket connection,
// clients are registered and then kept in a loop listening for messages
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
		case MessageOperation:
			// Send message to broadcast channel
			broadcast <- req
		case CandidateOperation:
			log.Println("---------------------")
			log.Println(req.Candidate.Username)
			log.Println(req.Candidate.Candidate)
			log.Println("---------------------")
		case CandidateOfferOperation:
			handleCandidateOffer(req.CandidateOffer.Username) // For now username will be users id
		}
	}
}

func handleCandidateOffer(u string) {
	log.Println("---------------------")
	log.Println(u)
	log.Println("---------------------")

	c, _ := strconv.ParseInt(u, 10, 64)
	if _, ok := clients[int(c)]; ok {
		log.Println("Found client asked for..")
	}
}

// Listen for messages put in the broadcast channel and send them to all clients
func handleMessages() {
	for {
		// Get the message from the broadcast channel
		msg := <-broadcast

		if msg.Operation == ClientOperation {
			if _, ok := clients[msg.Client.ID]; ok {
				err := msg.Client.WSID.WriteJSON(msg)
				if err != nil {
					log.Printf("error: %v", err)
					msg.Client.WSID.Close()
					manageClient(false, msg.Client.WSID)
				}
			}
		} else {
			// Send it out to every client that is currently connected
			for client := range clients {
				c := clients[client].WSID

				err := c.WriteJSON(msg)
				if err != nil {
					log.Printf("error: %v", err)
					c.Close()
					manageClient(false, c)
				}
			}
		}
	}
}

// Register or remove a client then broadcast the change
func manageClient(shouldAdd bool, ws *websocket.Conn) {
	rand.Seed(time.Now().UnixNano())
	id := rand.Int()
	cl := Client{
		ID:   id,
		WSID: ws,
	}

	// Add or remove a client
	if shouldAdd {
		// Register client to our map
		clients[id] = cl

		// Send client their ID
		broadcast <- Operation{
			Operation: ClientOperation,
			Client:    &cl,
		}
	} else {
		delete(clients, id)
	}

	// Broadcast new client count
	broadcast <- Operation{
		Operation: ClientsOperation,
		Clients: &Clients{
			Amount: len(clients),
		},
	}

	log.Printf("Clients: %v", clients)
}
