(function() {
    /* =========================================
       1. CONFIGURATION
    ========================================= */
    const STORAGE_KEY = 'system_warning_consent'; 
    const SCROLL_THRESHOLD = 10; 

    const phrases = [
        // English
        "STOP", "DON'T TOUCH", "NO!", "YAMETEEEEEE!", 
        "DAME!", "BAKA!", "ERROR", "FATAL", "FORBIDDEN",
        "ASU", "KYAAAAA!", "ANJING", "BUTO", "BABI", "PUKIMAK", "ANJING",
        
        // Japanese
        "やめて!",      // Stop!
        "触らないで!",  // Don't touch!
        "ダメ!",       // No/Bad!
        "うるさい!",    // Shut up/Noisy!
        "警告",        // Warning
        "エラー",      // Error
        
        // Chinese
        "不要!",       // Don't!
        "禁止",        // Forbidden
        "错误",        // Error
        "停下",        // Stop
        "住手",        // Stop your hand
        "别碰"         // Don't touch 
    ];

    const audioSources = [
        'intro1.wav', 'intro2.wav', 'intro3.wav', 'intro4.wav'
    ];

    // CONFIG: LOUDNESS SETTINGS
    // Gain of 5.0 is already loud.
    // Stacking it 5 times creates constructive interference 
    // effectively resulting in a 25x amplitude spike.
    const VOLUME_GAIN = 5.0; 
    const AUDIO_LAYERS = 6; // How many copies to play at once

    /* =========================================
       2. STATE MANAGEMENT
    ========================================= */
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; 
    let isAccepted = false; 
    let areAssetsLoaded = false; 
    let lastAudioIndex = -1;

    let touchStartX = 0;
    let touchStartY = 0;

    const hasPriorConsent = localStorage.getItem(STORAGE_KEY) === 'true';

    /* =========================================
       3. UI & CSS INJECTION
    ========================================= */
    const style = document.createElement('style');
    style.innerHTML = `
        /* Overlay styles */
        #consent-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            background-color: rgba(0, 0, 0, 0.4); 
            z-index: 2147483646;
            display: flex; align-items: flex-end; justify-content: center;
            padding-bottom: 50px; opacity: 1; transition: opacity 0.3s ease-out;
        }
        #consent-box {
            background-color: #3a3a3a; color: #fff;
            width: 90%; max-width: 900px; padding: 20px;
            border: 4px solid #000;
            box-shadow: inset 4px 4px 0 rgba(255,255,255,0.1), inset -4px -4px 0 rgba(0,0,0,0.2), 0 10px 25px rgba(0,0,0,0.5);   
            display: flex; align-items: center; justify-content: space-between;
            gap: 20px; font-family: 'VT323', monospace;
        }
        .consent-text h3 { margin: 0; color: #ff6ec7; font-size: 1.8rem; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
        .consent-text p { margin: 5px 0 0 0; font-size: 1.2rem; color: #ccc; }
        #loading-status { color: #ff92df; font-weight: bold; }
        
        /* Warning Flash */
        #warning-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(242, 0, 255, 1); 
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            color: #ffffff; display: flex; justify-content: center; align-items: center;
            z-index: 2147483647; pointer-events: none; opacity: 0;
            transition: opacity 0.05s ease-out; 
        }
        #warning-text {
            font-family: 'VT323', monospace; font-size: 6rem;
            font-weight: 900; text-transform: uppercase;
            text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 4px 4px 0px #000;
            animation: shake 0.1s infinite;
        }
        @media (max-width: 600px) {
            #consent-box { flex-direction: column; text-align: center; }
            #consent-box button { width: 100%; }
        }
        @keyframes shake {
            0% { transform: translate(2px, 2px) rotate(0deg); }
            100% { transform: translate(-2px, -2px) rotate(-2deg); }
        }
    `;
    document.head.appendChild(style);

    const flashOverlay = document.createElement('div');
    flashOverlay.id = 'warning-flash';
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    flashOverlay.appendChild(textSpan);
    document.body.appendChild(flashOverlay);

    const consentOverlay = document.createElement('div');
    consentOverlay.id = 'consent-overlay';
    
    if (hasPriorConsent) {
        consentOverlay.style.display = 'none';
        isAccepted = true; 
    }

    consentOverlay.innerHTML = `
        <div id="consent-box">
            <div class="consent-text">
                <h3>₊˚⊹ᰔ✨ Consent policy</h3>
                <p>This site is using media playback feature to enhance reader experience, it is required to view the site.</p>
                <p id="loading-status">Loading Assets...</p>
            </div>
            <button id="accept-btn" class="mc-btn" disabled>INITIALIZE</button>
        </div>
    `;
    document.body.appendChild(consentOverlay);

    /* =========================================
       4. AUDIO ENGINE (Web Audio API)
    ========================================= */
    async function initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        const loadBtn = document.getElementById('accept-btn');
        const loadText = document.getElementById('loading-status');

        try {
            const fetchPromises = audioSources.map(src => fetch(src));
            const responses = await Promise.all(fetchPromises);
            const bufferPromises = responses.map(res => res.arrayBuffer());
            const arrayBuffers = await Promise.all(bufferPromises);
            const decodePromises = arrayBuffers.map(buf => audioContext.decodeAudioData(buf));
            
            audioBuffers = await Promise.all(decodePromises);
            areAssetsLoaded = true;

            loadText.innerText = "Assets Loaded. Click Initialize to enter.";
            loadBtn.innerText = "I ACCEPT";
            loadBtn.disabled = false;
            
            loadBtn.addEventListener('click', () => {
                if (audioContext.state === 'suspended') audioContext.resume();
                localStorage.setItem(STORAGE_KEY, 'true');

                consentOverlay.style.opacity = '0';
                setTimeout(() => {
                    consentOverlay.style.display = 'none';
                    isAccepted = true;
                }, 300);
            });

        } catch (error) {
            loadText.innerText = "Failed to load audio.";
            console.error(error);
        }
    }

    /**
     * MODIFIED: playSound
     * Now loops AUDIO_LAYERS times to stack the sound waves.
     */
    function playSound(buffer) {
        if (!audioContext) return;

        // Loop to create multiple overlapping sources
        for (let i = 0; i < AUDIO_LAYERS; i++) {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = VOLUME_GAIN; 
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Start immediately
            source.start(0);

            // Only attach the 'onended' listener to the LAST layer
            // to prevent the flag from flipping multiple times
            if (i === AUDIO_LAYERS - 1) {
                source.onended = () => { isPlaying = false; };
            }
        }
    }

    /* =========================================
       5. TRIGGER LOGIC
    ========================================= */
    async function triggerWarning(e) {
        if (!isAccepted || !areAssetsLoaded || isPlaying) return; 

        if (e && e.target && e.target.closest('#consent-overlay')) return;
        if (e && e.target && e.target.closest('a')) return;

        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        isPlaying = true; 

        // 1. Visuals
        textSpan.innerText = phrases[Math.floor(Math.random() * phrases.length)];
        flashOverlay.style.opacity = '1';
        setTimeout(() => { flashOverlay.style.opacity = '0'; }, 100);

        // 2. Audio
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioBuffers.length);
        } while (newIndex === lastAudioIndex && audioBuffers.length > 1);
        lastAudioIndex = newIndex;

        if (audioBuffers[newIndex]) {
            playSound(audioBuffers[newIndex]);
        } else {
            isPlaying = false;
        }
    }

    /* =========================================
       6. LISTENERS
    ========================================= */
    initAudio();

    window.addEventListener('keydown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    window.addEventListener('mousedown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    window.addEventListener('touchstart', (e) => {
        if(isAccepted && e.touches.length > 0) {
            touchStartX = e.touches[0].screenX;
            touchStartY = e.touches[0].screenY;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if(isAccepted && e.changedTouches.length > 0) {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = Math.abs(touchEndX - touchStartX);
            const diffY = Math.abs(touchEndY - touchStartY);

            if (diffX < SCROLL_THRESHOLD && diffY < SCROLL_THRESHOLD) {
                triggerWarning(e);
            }
        }
    });

})();