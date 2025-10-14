document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & Element Selection ---
    const socket = io(); // Connect to the server that served the page
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusOverlay = document.getElementById('status-overlay');
    const statusText = document.getElementById('status-text');
    const hangupBtn = document.getElementById('hangup-btn');
    // Add these lines after const hangupBtn = ...
    const localVideoContainer = document.getElementById('local-video-container');
    const toggleAudioBtn = document.getElementById('toggle-audio-btn');
    const toggleVideoBtn = document.getElementById('toggle-video-btn');

    let localStream;
    let peerConnection;

    // --- Core WebRTC Logic ---

    /**
     * Creates and configures the RTCPeerConnection object.
     * This is the heart of the WebRTC process.
     */
    const createPeerConnection = () => {
        peerConnection = new RTCPeerConnection(configuration);

        // Add local media tracks to the connection to be sent to the peer
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Event handler: When an ICE candidate is generated, send it to the peer via the server
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_signal', { call_id: callId, payload: { candidate: event.candidate } });
            }
        };

        // Event handler: When a remote stream is received, display it in the remoteVideo element
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
            statusOverlay.style.display = 'none'; // Hide the "Connecting..." overlay
        };
    };

    // --- Signaling Logic (Communication with Server) ---

    /**
     * Main handler for all signals received from the server.
     * It processes offers, answers, and ICE candidates.
     */
    socket.on('webrtc_signal', async ({ payload }) => {
        if (payload.sdp) { // This is an SDP offer or answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            // If we received an offer, we must create an answer
            if (payload.sdp.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('webrtc_signal', { call_id: callId, payload: { sdp: peerConnection.localDescription } });
            }
        } else if (payload.candidate) { // This is an ICE candidate
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
    });

    /**
     * Fired when the server confirms both peers are in the room.
     * The designated initiator will start the call by creating an offer.
     */
    socket.on('peers_ready', (data) => {
        createPeerConnection();
        hangupBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        toggleVideoBtn.disabled = false;
        
        if (data.initiator_sid === socket.id) {
            statusText.textContent = 'Peer found. Creating offer...';
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('webrtc_signal', { call_id: callId, payload: { sdp: peerConnection.localDescription } });
                })
                .catch(e => console.error("Offer creation error:", e));
        } else {
            statusText.textContent = 'Peer found. Waiting for offer...';
        }
    });
    // --- Mute/Unmute Functions ---
    const toggleAudio = () => {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;

            const icon = toggleAudioBtn.querySelector('i');
            if (audioTrack.enabled) {
                icon.classList.remove('fa-microphone-slash');
                icon.classList.add('fa-microphone');
                toggleAudioBtn.classList.remove('is-muted');
                toggleAudioBtn.title = 'Mute Audio';
            } else {
                icon.classList.remove('fa-microphone');
                icon.classList.add('fa-microphone-slash');
                toggleAudioBtn.classList.add('is-muted');
                toggleAudioBtn.title = 'Unmute Audio';
            }
        }
    };

    const toggleVideo = () => {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;

            const icon = toggleVideoBtn.querySelector('i');
            if (videoTrack.enabled) {
                icon.classList.remove('fa-video-slash');
                icon.classList.add('fa-video');
                toggleVideoBtn.classList.remove('is-muted');
                localVideoContainer.classList.remove('video-off');
                toggleVideoBtn.title = 'Stop Video';
            } else {
                icon.classList.remove('fa-video');
                icon.classList.add('fa-video-slash');
                toggleVideoBtn.classList.add('is-muted');
                localVideoContainer.classList.add('video-off');
                toggleVideoBtn.title = 'Start Video';
            }
        }
    };

    // --- Cleanup and Initialization ---

    /**
     * Gracefully closes the connection and cleans up resources.
     */
    const closeCall = () => {
        socket.emit('leave_call_room', { call_id: callId });
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        statusText.textContent = 'Call ended.';
        statusOverlay.style.display = 'flex'; // Show overlay with "Call ended" message
        setTimeout(() => window.close(), 2000);
    };

    hangupBtn.addEventListener('click', closeCall);
    window.addEventListener('beforeunload', closeCall); // Handle closing the tab
    socket.on('peer_left', closeCall);

    /**
     * Initializes the entire call process.
     */
    const initialize = async () => {
        try {
            statusText.textContent = 'Getting camera and microphone...';
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            toggleAudioBtn.addEventListener('click', toggleAudio);
            toggleVideoBtn.addEventListener('click', toggleVideo);
            
            // Announce readiness to the server
            socket.emit('join_call_room', { call_id: callId });
            statusText.textContent = "Waiting for peer to join...";
        } catch (error) {
            console.error("Error accessing media devices:", error);
            statusText.textContent = "Error: Could not access camera/mic. Please check permissions.";
        }
    };

    // --- Start the call process ---
    initialize();
});