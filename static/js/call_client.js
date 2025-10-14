document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & Element Selection ---
    const socket = io(); // Connect to the server that served the page
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusOverlay = document.getElementById('status-overlay');
    const statusText = document.getElementById('status-text');
    const hangupBtn = document.getElementById('hangup-btn');
    const localVideoContainer = document.getElementById('local-video-container');
    const toggleAudioBtn = document.getElementById('toggle-audio-btn');
    const toggleVideoBtn = document.getElementById('toggle-video-btn');
    
    // --- Element selections for document sharing ---
    const shareDocBtn = document.getElementById('share-doc-btn');
    const docUploadInput = document.getElementById('doc-upload-input');
    const docViewerModal = document.getElementById('doc-viewer-modal');
    const closeDocViewerBtn = document.getElementById('close-doc-viewer-btn');
    const docImageContainer = document.getElementById('doc-image-container');

    let localStream;
    let peerConnection;

    // --- Core WebRTC Logic (UNCHANGED) ---
    const createPeerConnection = () => {
        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_signal', { call_id: callId, payload: { candidate: event.candidate } });
            }
        };

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
            statusOverlay.style.display = 'none';
        };
    };

    // --- Signaling Logic (UNCHANGED) ---
    socket.on('webrtc_signal', async ({ payload }) => {
        if (payload.sdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            if (payload.sdp.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('webrtc_signal', { call_id: callId, payload: { sdp: peerConnection.localDescription } });
            }
        } else if (payload.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
    });

    socket.on('peers_ready', (data) => {
        createPeerConnection();
        hangupBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        toggleVideoBtn.disabled = false;
        shareDocBtn.disabled = false; // Enable the share button
        
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

    // --- Mute/Unmute Functions (UNCHANGED) ---
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

    // --- Document Sharing Logic ---

    // 1. Trigger file input (UNCHANGED)
    shareDocBtn.addEventListener('click', () => {
        docUploadInput.click();
    });

    // 2. Handle the file upload process (MODIFIED FOR "OKAY" BUTTON)
    docUploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const loader = statusOverlay.querySelector('.loader');
        
        if (loader) loader.style.display = 'block';
        statusText.textContent = 'Uploading and securing document...';
        statusOverlay.style.display = 'flex';

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await fetch(`/call/${callId}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed on server.');
            }

            const data = await response.json();
            socket.emit('share_document', { call_id: callId, urls: data.urls });
            
            statusText.textContent = 'Document sent successfully!';
            
            setTimeout(() => {
                if (statusText.textContent === 'Document sent successfully!') {
                    statusOverlay.style.display = 'none';
                }
            }, 2000);

        } catch (error) {
            console.error('Upload error:', error);
            
            if (loader) loader.style.display = 'none';
            statusText.textContent = 'Document upload failed.';

            const okButton = document.createElement('button');
            okButton.textContent = 'Okay';
            okButton.className = 'status-ok-btn';

            okButton.addEventListener('click', () => {
                statusOverlay.style.display = 'none';
                okButton.remove();
                if (loader) loader.style.display = 'block';
            });

            statusOverlay.appendChild(okButton);

        } finally {
            docUploadInput.value = '';
        }
    });

    // 3. Listen for a shared document (UNCHANGED)
    socket.on('document_shared', (data) => {
        const { urls } = data;
        if (urls && urls.length > 0) {
            docImageContainer.innerHTML = '';
            urls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                docImageContainer.appendChild(img);
            });
            docViewerModal.classList.remove('hidden');
        }
    });

    // 4. Handle modal closing and screenshot deterrence (UNCHANGED)
    closeDocViewerBtn.addEventListener('click', () => {
        docViewerModal.classList.add('hidden');
        docImageContainer.innerHTML = '';
    });

    docImageContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    
    // --- Cleanup and Initialization (UNCHANGED) ---
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
        statusOverlay.style.display = 'flex';
        setTimeout(() => window.close(), 2000);
    };

    hangupBtn.addEventListener('click', closeCall);
    window.addEventListener('beforeunload', closeCall);
    socket.on('peer_left', closeCall);

    const initialize = async () => {
        try {
            statusText.textContent = 'Getting camera and microphone...';
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            toggleAudioBtn.addEventListener('click', toggleAudio);
            toggleVideoBtn.addEventListener('click', toggleVideo);
            
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