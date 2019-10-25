
// Generate random room name if needed
if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
// const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
const configuration = {
    'iceServers': [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'turn:192.158.29.39:3478?transport=udp',
            'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            'username': '28224511:1379330808'
        },
        {
            'urls': 'turn:192.158.29.39:3478?transport=tcp',
            'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            'username': '28224511:1379330808'
        }
    ]
};
let room;
let pc;


var socket = io();

socket.on('connect', function () {
    socket.emit('join:room', {room_id: roomName});

    socket.on('room:members', function (members) {

        console.log('MEMBERS', members);
        // If we are the second user to connect to the room we will be creating the offer
        if (members.length > 2) {
            console.log('3 people not allowed')
            return
        }

        const isOfferer = members.length === 2;
        if (!isOfferer) {
            messageDiv.innerHTML = "Wait for other person to connect";
        } else {
            messageDiv.innerHTML = "<button onclick=\"startVideo();\">Start Video Session</button>";
        }
        startWebRTC(isOfferer);
    });
});




function onSuccess() {
};

function onError(error) {
    console.error(error);
};

// Send signaling data via socketio
function sendMessage(message) {
    socket.emit('room:event', {room_id: roomName, message});
}

function startWebRTC(isOfferer) {
    pc = new RTCPeerConnection(configuration);

    // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
    // message to the other peer through the signaling server
    pc.onicecandidate = event => {
        if (event.candidate) {
            console.log(event);
            sendMessage({'candidate': event.candidate});
        }
    };

    // If user is offerer let the 'negotiationneeded' event create the offer
    if (isOfferer) {
        pc.onnegotiationneeded = () => {
            pc.createOffer().then(localDescCreated).catch(onError);
        }
    }

    // When a remote stream arrives display it in the #remoteVideo element
    pc.ontrack = event => {
        const stream = event.streams[0];
        console.log(stream);
        if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
            remoteVideo.srcObject = stream;
        }
    };

    var constraints = {
        video: {
            width: {ideal: 4096},
            height: {ideal: 2160}
        }
    };
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
            width: {ideal: 4096},
            height: {ideal: 2160}
        },
    }).then(stream => {
        // Display your local video in #localVideo element
        localVideo.srcObject = stream;
        // Add your stream to be sent to the conneting peer
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }, onError);

    // Listen to signaling data from socket
    socket.on('room:event', (message) => {
        // Message was sent by us
        if (socket.id === message.senderId) {
            return;
        }

        if (message.sdp) {
            // This is called after receiving an offer or answer from another peer
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
                // When receiving an offer lets answer it
                if (pc.remoteDescription.type === 'offer') {
                    pc.createAnswer().then(localDescCreated).catch(onError);
                }
            }, onError);
        } else if (message.candidate) {
            // Add the new ICE candidate to our connections remote description
            pc.addIceCandidate(
                new RTCIceCandidate(message.candidate), onSuccess, onError
            );
        }
    });
}

function localDescCreated(desc) {
    pc.setLocalDescription(
        desc,
        () => sendMessage({'sdp': pc.localDescription}),
        onError
    );
}
