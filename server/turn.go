package main

import (
	"log"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/pion/logging"
	"github.com/pion/turn"
)

const (
	publicIP = "192.168.0.11"
	port     = 3478
	realm    = "chat.app"
)

// Initialize turn server
func startTurnServer() {
	log.Println("TURN: Starting server")

	// Create UDP listener
	udpListener, err := net.ListenPacket("udp4", "0.0.0.0:"+strconv.Itoa(port))
	if err != nil {
		log.Panicf("Failed to create TURN server listener: %s", err)
	}

	// Cache -users flag for easy lookup later
	usersMap := map[string][]byte{}
	usersMap["user"] = turn.GenerateAuthKey("user", realm, "pass")

	s, err := turn.NewServer(turn.ServerConfig{
		Realm: realm,
		// Set AuthHandler callback
		// This is called everytime a user tries to authenticate with the TURN server
		// Return the key for that user, or false when no user is found
		AuthHandler: func(username string, realm string, srcAddr net.Addr) ([]byte, bool) {
			log.Println("TURN: Authenticating new user")

			if key, ok := usersMap[username]; ok {
				return key, true
			}
			return nil, false
		},
		// PacketConnConfigs is a list of UDP Listeners and the configuration around them
		PacketConnConfigs: []turn.PacketConnConfig{
			{
				PacketConn: udpListener,
				RelayAddressGenerator: &turn.RelayAddressGeneratorStatic{
					RelayAddress: net.ParseIP(publicIP), // Claim that we are listening on IP passed by user (This should be your Public IP)
					Address:      "0.0.0.0",             // But actually be listening on every interface
				},
			},
		},
		LoggerFactory: logging.NewDefaultLoggerFactory(),
	})
	if err != nil {
		log.Panic(err)
	}

	// Block until user sends SIGINT or SIGTERM
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	<-sigs

	if err = s.Close(); err != nil {
		log.Panic(err)
	}
}
