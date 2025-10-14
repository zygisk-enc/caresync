document.addEventListener('DOMContentLoaded', () => {
    // --- Get all elements for the main page ---
    const splashScreen = document.getElementById('splash-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const disclaimerBackdrop = document.getElementById('disclaimer-backdrop');
    const readCheckbox = document.getElementById('disclaimer-checkbox');
    const dontAskCheckbox = document.getElementById('dont-ask-again-checkbox');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');
    const aiInput = document.getElementById('ai-input');
    const starfield = document.getElementById('starfield-container');
    const attachBtn = document.getElementById('attach-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const uploadOptions = document.getElementById('upload-options');
    const imageOptionBtn = document.getElementById('image-option-btn');
    const selectedImagePreviewContainer = document.getElementById('selected-image-preview-container');
    const sendBtn = document.getElementById('send-prompt-btn');
    const chatDisplay = document.getElementById('chat-display-area');
    const welcomeSection = document.querySelector('.welcome-section');
    const promptSection = document.querySelector('.ai-prompt-section');
    const quickActions = document.querySelector('.quick-actions-section');

    // --- Starfield Logic ---
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
                star.dataset.parallaxRate = size;
                starfield.appendChild(star);
                stars.push(star);
            }
        }
        function handleMouseMove(e) {
            const { clientX, clientY } = e;
            const xRatio = (clientX - window.innerWidth / 2) / window.innerWidth;
            const yRatio = (clientY - window.innerHeight / 2) / window.innerHeight;
            stars.forEach(star => {
                const parallaxRate = star.dataset.parallaxRate;
                const x = xRatio * 40 * parallaxRate;
                const y = yRatio * 40 * parallaxRate;
                star.style.transform = `translate(${x}px, ${y}px)`;
            });
        }
        function handleMouseLeave() {
            stars.forEach(star => { star.style.transform = `translate(0, 0)`; });
        }
        generateStars();
        document.body.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);
    }

    // --- Splash Screen & Disclaimer Logic ---
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
            startTypingAnimation();
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
            startTypingAnimation();
        }, 300);
    }
    runSplashScreen();

    // --- Event Listeners ---
    if(readCheckbox) readCheckbox.addEventListener('change', () => { agreeBtn.disabled = !readCheckbox.checked; });
    if(agreeBtn) agreeBtn.addEventListener('click', () => {
        if (readCheckbox.checked) {
            if (dontAskCheckbox.checked) { localStorage.setItem('disclaimerAgreed', 'true'); }
            hideDisclaimer();
        }
    });
    if(disagreeBtn) disagreeBtn.addEventListener('click', () => { window.close(); });
    if(aiInput) aiInput.addEventListener('input', () => {
        aiInput.style.height = 'auto';
        aiInput.style.height = (aiInput.scrollHeight) + 'px';
    });
    if(attachBtn) attachBtn.addEventListener('click', (event) => { event.stopPropagation(); uploadOptions.classList.toggle('hidden'); });
    if(imageOptionBtn) imageOptionBtn.addEventListener('click', () => { imageUploadInput.click(); uploadOptions.classList.add('hidden'); });
    document.addEventListener('click', (event) => {
        if (uploadOptions && attachBtn && !attachBtn.contains(event.target) && !uploadOptions.contains(event.target)) {
            uploadOptions.classList.add('hidden');
        }
    });
    if(imageUploadInput) imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) { displayImagePreview(file); }
    });

    // --- AI Prompt & Chat Logic ---
    function handleSendPrompt() {
        const promptText = aiInput.value.trim();
        if (!promptText) return;

        if (chatDisplay.style.display !== 'flex') {
            welcomeSection.classList.add('hidden');
            quickActions.classList.add('hidden');
            promptSection.classList.add('fixed-bottom');
            chatDisplay.style.display = 'flex';
        }

        addMessageToChat('user', promptText);
        aiInput.value = '';
        aiInput.style.height = 'auto';
        const botBubble = addMessageToChat('bot', '...', true);

        fetch('/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText }),
        })
        .then(response => response.json())
        .then(data => {
            updateMessageInChat(botBubble, data.error ? `Error: ${data.error}` : data.response);
        })
        .catch(error => {
            updateMessageInChat(botBubble, 'An unexpected error occurred.');
        });
    }

    function addMessageToChat(sender, text, isLoading = false) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', `${sender}-bubble`);
        updateMessageInChat(bubble, text, isLoading);
        chatDisplay.appendChild(bubble);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
        return bubble;
    }

    function updateMessageInChat(bubbleElement, text, isLoading = false) {
        if (isLoading) {
            bubbleElement.classList.add('loading');
            bubbleElement.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        } else {
            bubbleElement.classList.remove('loading');
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            bubbleElement.innerHTML = formattedText;
        }
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendPrompt);
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendPrompt(); }
        });
    }

    // --- Typing Animation ---
    function startTypingAnimation() {
        // ... (typing animation logic) ...
    }
    function displayImagePreview(file) {
        // ... (image preview logic) ...
    }
});



  