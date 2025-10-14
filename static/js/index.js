document.addEventListener('DOMContentLoaded', () => {
    // --- Elements for the main page (Combined) ---
    const splashScreen = document.getElementById('splash-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const disclaimerBackdrop = document.getElementById('disclaimer-backdrop');
    const readCheckbox = document.getElementById('disclaimer-checkbox');
    const dontAskCheckbox = document.getElementById('dont-ask-again-checkbox');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');

    const aiInput = document.getElementById('ai-input');
    const starfield = document.getElementById('starfield-container');
    const sendBtn = document.getElementById('send-prompt-btn');
    const chatDisplay = document.getElementById('chat-display-area');

    const welcomeSection = document.querySelector('.welcome-section');
    const promptSection = document.querySelector('.ai-prompt-section');
    const quickActions = document.querySelector('.quick-actions-section');
    const logoLink = document.getElementById('logo-link');
    const cameraBtn = document.getElementById('camera-btn');
    const micBtn = document.querySelector('.fa-microphone');
    


    // --- NEW: Elements for image upload ---
    const attachBtn = document.getElementById('attach-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const selectedImagePreviewContainer = document.getElementById('selected-image-preview-container');
    let selectedImageFiles = []; // This will store the selected image files

    // --- Starfield Logic (from original file) ---
    if (starfield) {
        let stars = [];

        function generateStars() {
            const starCount = 200;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                const size = Math.floor(Math.random() * 3) + 1;
                star.classList.add('star', `s${size}`);
                star.style.top = `${Math.random() * 100}%`;
                star.style.left = `${Math.random() * 100}%`;
                star.style.animationDelay = `${Math.random() * 3}s`;
                star.style.animationDuration = `${Math.random() * 2 + 3}s`;
                star.dataset.parallaxRate = String(size);
                starfield.appendChild(star);
                stars.push(star);
            }
        }

        function handleMouseMove(e) {
            const { clientX, clientY } = e;
            const xRatio = (clientX - window.innerWidth / 2) / window.innerWidth;
            const yRatio = (clientY - window.innerHeight / 2) / window.innerHeight;
            stars.forEach(star => {
                const parallaxRate = Number(star.dataset.parallaxRate || 1);
                const x = xRatio * 40 * parallaxRate;
                const y = yRatio * 40 * parallaxRate;
                star.style.transform = `translate(${x}px, ${y}px)`;
            });
        }

        function handleMouseLeave() {
            stars.forEach(star => { star.style.transform = 'translate(0, 0)'; });
        }

        generateStars();
        document.body.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);
    }

    // --- Splash Screen & Disclaimer Logic (from original file) ---
    function runSplashScreen() {
        if (!splashScreen) return;
        setTimeout(() => {
            if (localStorage.getItem('disclaimerAgreed') === 'true') {
                hideSplashAndShowApp();
            } else {
                hideSplashAndShowDisclaimer();
            }
        }, 1000);
    }

    function hideSplashAndShowDisclaimer() {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            showDisclaimer();
        }, 500);
    }

    function hideSplashAndShowApp() {
        splashScreen.style.opacity = '0';
        appWrapper.classList.remove('hidden');
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            appWrapper.style.opacity = '1';
        }, 500);
    }

    function showDisclaimer() {
        disclaimerBackdrop.classList.remove('hidden');
        appWrapper.classList.add('blur-background');
        appWrapper.classList.remove('hidden');
        appWrapper.style.opacity = '1';
        setTimeout(() => { disclaimerBackdrop.style.opacity = '1'; }, 20);
    }

    function hideDisclaimer() {
        disclaimerBackdrop.style.opacity = '0';
        appWrapper.classList.remove('blur-background');
        setTimeout(() => {
            disclaimerBackdrop.classList.add('hidden');
        }, 300);
    }

    runSplashScreen();

    if (readCheckbox && agreeBtn) {
        readCheckbox.addEventListener('change', () => {
            agreeBtn.disabled = !readCheckbox.checked;
        });
    }

    if (agreeBtn) {
        agreeBtn.addEventListener('click', () => {
            if (readCheckbox && readCheckbox.checked) {
                if (dontAskCheckbox && dontAskCheckbox.checked) {
                    localStorage.setItem('disclaimerAgreed', 'true');
                }
                hideDisclaimer();
            }
        });
    }

    if (disagreeBtn) {
        disagreeBtn.addEventListener('click', () => { window.close(); });
    }

    // --- NEW: Image Upload Handling Logic ---
    if (attachBtn && imageUploadInput) {
        attachBtn.addEventListener('click', () => imageUploadInput.click());
    }

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (event) => {
            Array.from(event.target.files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    // Avoid adding duplicates if user selects the same file again
                    if (!selectedImageFiles.some(f => f.name === file.name && f.size === file.size)) {
                         selectedImageFiles.push(file);
                         displayImagePreview(file, selectedImageFiles.length - 1);
                    }
                }
            });
            event.target.value = ''; // Allow re-selecting the same file
        });
    }
    if (cameraBtn && imageUploadInput) {
        cameraBtn.addEventListener('click', () => {
            // --- CHANGE: Use 'user' to activate the front-facing webcam ---
            imageUploadInput.setAttribute('capture', 'user'); 
            imageUploadInput.click(); 

            // After the click, we can remove the attribute so the paperclip icon works normally
            imageUploadInput.removeAttribute('capture');
        });
    }

    function displayImagePreview(file, index) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewBox = document.createElement('div');
            previewBox.className = 'image-preview-box';
            previewBox.dataset.index = index;
            previewBox.innerHTML = `
                <img src="${e.target.result}" alt="Image preview">
                <button class="remove-image-btn">&times;</button>
            `;
            selectedImagePreviewContainer.appendChild(previewBox);
        };
        reader.readAsDataURL(file);
    }

    if (selectedImagePreviewContainer) {
        selectedImagePreviewContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-image-btn')) {
                const previewBox = event.target.closest('.image-preview-box');
                const indexToRemove = parseInt(previewBox.dataset.index, 10);
                
                // Use filter to create a new array without the removed item
                selectedImageFiles = selectedImageFiles.filter((_, i) => i !== indexToRemove);
                
                // Re-render all previews to ensure indices are correct
                selectedImagePreviewContainer.innerHTML = '';
                selectedImageFiles.forEach((file, newIndex) => {
                    displayImagePreview(file, newIndex);
                });
            }
        });
    }

    // --- Chat helpers (from original file) ---
    function ensureChatVisible() {
        if (!chatDisplay) return;
        if (chatDisplay.style.display !== 'flex') {
            if (welcomeSection) welcomeSection.classList.add('hidden');
            if (quickActions) quickActions.classList.add('hidden');
            if (promptSection) promptSection.classList.add('fixed-bottom');
            chatDisplay.style.display = 'flex';
        }
    }

    function addMessageToChat(sender, htmlContent, isLoading = false) {
        if (!chatDisplay) return null;
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', `${sender}-bubble`);
        if (isLoading) {
            bubble.classList.add('loading');
            bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        } else {
            // Directly use htmlContent, assuming it's safe (e.g., from our own formatting)
            bubble.innerHTML = htmlContent;
        }
        chatDisplay.appendChild(bubble);
        setTimeout(() => {
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }, 0);
        return bubble;
    }

    function updateMessageInChat(bubbleElement, text, isLoading = false) {
        if (!bubbleElement) return;
        if (isLoading) {
            bubbleElement.classList.add('loading');
            bubbleElement.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
            return;
        }
        bubbleElement.classList.remove('loading');
        // Format markdown-style bold and newlines
        bubbleElement.innerHTML = String(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    // --- REPLACED: AI Prompt & Chat Logic with Multimodal Support ---
    async function handleSendPrompt() {
        const promptText = aiInput.value.trim();
        if (!promptText && selectedImageFiles.length === 0) return;

        ensureChatVisible();

        // Format user message for display
        let userMessageHTML = promptText.replace(/\n/g, '<br>');
        if (selectedImageFiles.length > 0) {
            userMessageHTML += `<br><small>(${selectedImageFiles.length} image${selectedImageFiles.length > 1 ? 's' : ''} attached)</small>`;
        }
        addMessageToChat('user', userMessageHTML);

        // Clear inputs after sending
        aiInput.value = '';
        aiInput.style.height = 'auto';
        
        const botBubble = addMessageToChat('bot', '...', true);

        // Convert selected image files to Base64 strings to send as JSON
        const imagePromises = selectedImageFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get only the Base64 part
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        const base64Images = await Promise.all(imagePromises);
        
        // Clear the files and previews for the next prompt
        selectedImageFiles = [];
        selectedImagePreviewContainer.innerHTML = '';

        // Send data to backend
        fetch('/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: promptText,
                images: base64Images
            }),
        })
        .then(r => r.json())
        .then(data => {
            updateMessageInChat(botBubble, data?.error ? `Error: ${data.error}` : String(data?.response ?? ''));
        })
        .catch(() => {
            updateMessageInChat(botBubble, 'An unexpected error occurred.');
        });
    }

    if (sendBtn && aiInput) {
        sendBtn.addEventListener('click', handleSendPrompt);
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
            }
        });
    }

    // --- CareSync Logo Reset Logic (from original file) ---
    function resetToHome() {
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        if (quickActions) quickActions.classList.remove('hidden');
        if (promptSection) promptSection.classList.remove('fixed-bottom');

        if (chatDisplay) {
            chatDisplay.style.display = 'none';
            chatDisplay.innerHTML = '';
        }

        if (aiInput) {
            aiInput.value = '';
            aiInput.style.height = 'auto';
        }

        if (selectedImagePreviewContainer) {
            selectedImagePreviewContainer.innerHTML = '';
            selectedImageFiles = []; // Also clear the file array
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (logoLink) {
        logoLink.addEventListener('click', (event) => {
            event.preventDefault();
            resetToHome();
        });
    }

    // --- Audio-to-Text Integration (from original file) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && micBtn) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micBtn.addEventListener('click', () => {
            recognition.start();
        });

        recognition.onstart = () => {
            micBtn.classList.add('listening');
            aiInput.placeholder = 'Listening...';
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
            aiInput.placeholder = 'Ask MediBot anything...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            aiInput.value = transcript;
            aiInput.dispatchEvent(new Event('input', { bubbles: true }));
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            aiInput.placeholder = 'Sorry, speech recognition failed.';
            micBtn.classList.remove('listening');
        };

    } else {
        if (micBtn) {
            micBtn.style.display = 'none';
        }
    }
});