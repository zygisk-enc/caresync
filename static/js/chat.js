document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const socket = io();

    // Determine sender type based on session variables passed from template
    const senderType = currentDoctorId ? 'doctor' : 'user';

    // --- 1. ESTABLISH CONNECTION AND JOIN ROOM ---
    socket.on('connect', () => {
        console.log('Connected to chat server.');
        socket.emit('join_chat', { conversation_id: conversationId });
    });

    // --- 2. LOAD CHAT HISTORY ---
    async function loadHistory() {
        try {
            const response = await fetch(`/api/chat_history/${conversationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch chat history.');
            }
            const history = await response.json();
            chatMessages.innerHTML = ''; // Clear loading state
            history.forEach(msg => {
                // Pass the sender_type from the history to the display function
                displayMessage(msg.sender_type, msg.text);
            });
            scrollToBottom();
        } catch (error) {
            console.error(error);
            chatMessages.innerHTML = '<p class="error-message">Could not load chat history.</p>';
        }
    }

    // --- 3. HANDLE INCOMING MESSAGES ---
    socket.on('new_message', (data) => {
        if (data.conversation_id === conversationId) {
            // Pass the sender_type from the new message to the display function
            displayMessage(data.sender_type, data.text);
            scrollToBottom();
        }
    });

    // --- 4. SEND MESSAGE ---
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText) {
            const messageData = {
                conversation_id: conversationId,
                text: messageText,
                sender_type: senderType,
            };
            socket.emit('send_message', messageData);

            // Display the message locally immediately for better UX
            displayMessage(senderType, messageText);
            messageInput.value = '';
            scrollToBottom();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- UTILITY FUNCTIONS ---
    function displayMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-bubble');

        // This is the key logic fix. It compares the sender of the message ('user' or 'doctor')
        // with the type of the person currently viewing the page (senderType).
        if (sender === senderType) {
            messageDiv.classList.add('sent');
        } else {
            messageDiv.classList.add('received');
        }
        
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- INITIALIZE ---
    loadHistory();
});

