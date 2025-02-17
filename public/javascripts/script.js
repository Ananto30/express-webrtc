// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xffffff).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
// const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const roomName = "observable-" + roomHash;
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun2.l.google.com:19302", "stun:stun.l.google.com:19302"],
    },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "muazkh",
      username: "webrtc@live.com",
    },
  ],
};
let room;
let pc;

var socket = io();

socket.on("connect", function () {
  socket.emit("join:room", { room_id: roomName });

  socket.on("room:members", function (members) {
    console.log("MEMBERS", members);
    // If we are the second user to connect to the room we will be creating the offer
    if (members.length > 2) {
      messageDiv.innerHTML = "Room is full";
      return;
    }

    const isOfferer = members.length === 2;
    if (!isOfferer) {
      messageDiv.innerHTML = "Wait for other person to connect";
    } else {
      messageDiv.innerHTML =
        "You are both here! Enjoy your video call. 🎉";
    }
    startWebRTC(isOfferer);
  });
});

function onSuccess() {}

function onError(error) {
  console.error(error);
}

// Send signaling data via socketio
function sendMessage(message) {
  socket.emit("room:event", { room_id: roomName, message });
}

function startWebRTC(isOfferer) {
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        // echoCancellation: true,
        // noiseSuppression: true,
        sampleRate: 44100,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    .then((stream) => {
      // Initialize RTCPeerConnection before adding tracks
      pc = new RTCPeerConnection(configuration);

      // Display your local video in #localVideo element
      localVideo.srcObject = stream;
      localVideo.play();
      // Add your stream to be sent to the connecting peer
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
      // message to the other peer through the signaling server
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(event);
          sendMessage({ candidate: event.candidate });
        }
      };

      // If user is offerer let the 'negotiationneeded' event create the offer
      if (isOfferer) {
        pc.onnegotiationneeded = () => {
          pc.createOffer().then(localDescCreated).catch(onError);
        };
      }

      // When a remote stream arrives display it in the #remoteVideo element
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        console.log(stream);
        if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
          remoteVideo.srcObject = stream;
          remoteVideo.play(); // Ensure the remote video starts playing
        }
      };

      // Listen for ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          remoteVideo.srcObject = null;
          remoteVideo.style.backgroundColor = "black";
        }
      };

      // Listen to signaling data from socket
      socket.on("room:event", (message) => {
        // Message was sent by us
        if (socket.id === message.senderId) {
          return;
        }

        if (message.sdp) {
          // This is called after receiving an offer or answer from another peer
          pc.setRemoteDescription(
            new RTCSessionDescription(message.sdp),
            () => {
              // When receiving an offer lets answer it
              if (pc.remoteDescription.type === "offer") {
                pc.createAnswer().then(localDescCreated).catch(onError);
              }
            },
            onError
          );
        } else if (message.candidate) {
          // Add the new ICE candidate to our connections remote description
          pc.addIceCandidate(
            new RTCIceCandidate(message.candidate),
            onSuccess,
            onError
          );
        }
      });
    })
    .catch((error) => {
      console.error("Error accessing media devices.", error);
      messageDiv.innerHTML =
        "Without camera permission video session cannot be started.";
      // Set the video elements' background color to black if no stream is available
      localVideo.style.backgroundColor = "black";
      remoteVideo.style.backgroundColor = "black";
    });
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({ sdp: pc.localDescription }),
    onError
  );
}
