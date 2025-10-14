// The final and complete call-handler.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Get references to HTML elements ---
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const hangupBtn = document.getElementById('hangup-btn');
    const statusDiv = document.getElementById('call-status');
    const remoteUserName = document.getElementById('remote-user-name');

    // --- State variables ---
    let localStream;
    let peerConnection;
    let otherUserSid;

    // --- Connections ---
    const socket = io("https://192.168.199.154:5000"); // Make sure this IP is correct
    const configuration = {
        iceServers: [{
            urls: 'stun:stun.l.google.com:19302'
        }]
    };

    // --- Main initialization logic ---
    async function initializeCall() {
        await startMedia();
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('callee_id')) {
            // This is the PATIENT'S window (the caller).
            // It announces that it's ready to call the specific doctor.
            const calleeId = urlParams.get('callee_id');
            socket.emit('caller_ready', { callee_id: calleeId });
            statusDiv.textContent = "Connecting...";

        } else if (urlParams.get('mode') === 'callee') {
            // This is the DOCTOR'S window (the callee).
            // It announces that it's ready to receive a call.
            const callerName = urlParams.get('caller_name') || "Patient";
            remoteUserName.textContent = callerName;
            socket.emit('doctor_ready');
            statusDiv.textContent = "Connecting...";
        }
    }

    // --- NEW: Handshake is now triggered by the server ---
    socket.on('begin_webrtc_handshake', (data) => {
        if (data.peer_sid) {
            otherUserSid = data.peer_sid;
            console.log("Handshake initiated by server. Peer SID:", otherUserSid);
            
            // The patient (original caller) is responsible for creating the offer.
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('callee_id')) {
                createPeerConnection();
                peerConnection.createOffer()
                    .then(offer => peerConnection.setLocalDescription(offer))
                    .then(() => {
                        socket.emit('webrtc_signal', { to_sid: otherUserSid, payload: { sdp: peerConnection.localDescription } });
                    })
                    .catch(err => console.error("Offer creation error:", err));
            }
        }
    });

    // --- Main WebRTC signal handler (for SDP and ICE candidates) ---
    socket.on('webrtc_signal', async ({ from_sid, payload }) => {
        if (!otherUserSid) otherUserSid = from_sid;

        if (payload.sdp) { // Received an offer or an answer
            if (!peerConnection) createPeerConnection();
            
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

                if (peerConnection.remoteDescription.type === 'offer') {
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socket.emit('webrtc_signal', { to_sid: otherUserSid, payload: { sdp: peerConnection.localDescription } });
                }
            } catch (err) {
                console.error("Error with SDP:", err);
            }
        } else if (payload.candidate) { // Received an ICE candidate
            try {
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        } else if (payload.type === 'hangup') {
            statusDiv.textContent = "Call ended.";
            closeCall();
        }
    });

    // --- Core WebRTC helper functions (largely unchanged) ---
    function createPeerConnection() {
        peerConnection = new RTCPeerConnection(configuration);
        if (localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }
        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
            statusDiv.textContent = "Call in progress...";
        };
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('webrtc_signal', { to_sid: otherUserSid, payload: { candidate: event.candidate } });
            }
        };
    }

    async function startMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        } catch (error) {
            console.error("Error accessing media devices.", error);
            statusDiv.textContent = "Error: Could not access camera/mic.";
        }
    }

    function closeCall() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        window.close();
    }

    hangupBtn.addEventListener('click', () => {
        if (otherUserSid) socket.emit('webrtc_signal', { to_sid: otherUserSid, payload: { type: 'hangup' } });
        closeCall();
    });

    // --- Start the process ---
    initializeCall();
});