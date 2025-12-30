(function() {
    /* =========================================
       1. CONFIGURATION
    ========================================= */
    const phrases = [
        "STOP", "DON'T TOUCH", "NO!", "YAMETEEEEEE!", "やめて!", 
        "DAME!", "BAKA!", "ERROR", "FATAL", "FORBIDDEN", 
        "DON'T CLICK", "SYSTEM HALT", "KYAAAAA!", "HANDS OFF"
    ];

    const audioSources = [
        'intro1.wav', 'intro2.wav', 'intro3.wav', 'intro4.wav'
    ];

    // 5.0 = 500% Volume.
    const VOLUME_GAIN = 5.0; 

    /* =========================================
       2. STATE MANAGEMENT
    ========================================= */
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; 
    let isAccepted = false; 
    let lastAudioIndex = -1;

    /* =========================================
       3. UI & CSS INJECTION
    ========================================= */
    const style = document.createElement('style');
    style.innerHTML = `
        /* --- 1. The Full Screen Blur Overlay --- */
        #consent-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            backdrop-filter: blur(8px); 
            -webkit-backdrop-filter: blur(8px);
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 2147483646;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 50px;
            opacity: 1;
            transition: opacity 0.3s ease-out;
        }

        /* --- 2. The Minecraft "Cookie Banner" --- */
        #consent-box {
            background-color: var(--mc-stone, #3a3a3a);
            color: var(--text-main, #fff);
            width: 90%;
            max-width: 900px;
            padding: 20px;
            border: 4px solid var(--btn-border, #000);
            box-shadow: 
                inset 4px 4px 0 rgba(255,255,255,0.1),
                inset -4px -4px 0 rgba(0,0,0,0.2),
                0 10px 25px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            font-family: 'VT323', monospace;
        }

        .consent-text h3 {
            margin: 0;
            color: var(--pink-neon, #ff6ec7);
            font-size: 1.8rem;
            text-transform: uppercase;
            text-shadow: 2px 2px 0 #000;
        }

        .consent-text p {
            margin: 5px 0 0 0;
            font-size: 1.2rem;
            color: var(--text-muted, #ccc);
        }

        /* Loading State */
        #loading-status {
            color: var(--pink-pastel, #ff92df);
            font-weight: bold;
        }

        /* --- 3. The Red Flash Warning --- */
        #warning-flash {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #ff0000; color: #ffffff;
            display: flex; justify-content: center; align-items: center;
            z-index: 2147483647; 
            pointer-events: none; opacity: 0;
            transition: opacity 0.1s ease-out;
        }
        #warning-text {
            font-family: 'VT323', monospace; font-size: 6rem;
            font-weight: 900; text-transform: uppercase;
            text-shadow: 5px 5px 0px #000;
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

    // Create Warning Flash Layer
    const flashOverlay = document.createElement('div');
    flashOverlay.id = 'warning-flash';
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    flashOverlay.appendChild(textSpan);
    document.body.appendChild(flashOverlay);

    // Create Consent Banner
    const consentOverlay = document.createElement('div');
    consentOverlay.id = 'consent-overlay';
    
    consentOverlay.innerHTML = `
        <div id="consent-box">
            <div class="consent-text">
                <h3>⚠️ System Warning: Loud Audio</h3>
                <p>To enhance reading experience, this site uses media playback to provide immersive interaction between reader and website.</p>
                <p id="loading-status">Loading Assets...</p>
            </div>
            <button id="accept-btn" class="mc-btn" disabled>
                INITIALIZE
            </button>
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

            loadText.innerText = "Assets Loaded. Click Initialize to enter.";
            loadBtn.innerText = "I ACCEPT";
            loadBtn.disabled = false;
            
            loadBtn.addEventListener('click', () => {
                if (audioContext.state === 'suspended') audioContext.resume();
                
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

    // UPDATED: Now accepts an optional callback function (onComplete)
    function playSound(buffer, onComplete = null) {
        if (!audioContext) {
            if (onComplete) onComplete(); 
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = VOLUME_GAIN; 

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start(0);

        source.onended = () => {
            isPlaying = false; 
            flashOverlay.style.opacity = '0'; 
            
            // Execute the navigation or other logic after audio finishes
            if (onComplete) {
                onComplete();
            }
        };
    }

    /* =========================================
       5. TRIGGER LOGIC
    ========================================= */
    // UPDATED: Now accepts an optional callback
    function triggerWarning(event, callback = null) {
        if (!isAccepted || isPlaying) return; 
        
        isPlaying = true; 

        // 1. Visuals
        textSpan.innerText = phrases[Math.floor(Math.random() * phrases.length)];
        const bgColors = ['#ff0000', '#000000', '#ff00ff', '#0000ff'];
        flashOverlay.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];
        flashOverlay.style.opacity = '1';

        // 2. Audio Logic
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioBuffers.length);
        } while (newIndex === lastAudioIndex && audioBuffers.length > 1);
        lastAudioIndex = newIndex;

        if (audioBuffers[newIndex]) {
            playSound(audioBuffers[newIndex], callback);
        } else {
            // Fallback: If audio fails to trigger, still run the callback (navigation)
            // so the user isn't stuck.
            isPlaying = false;
            flashOverlay.style.opacity = '0';
            if (callback) callback();
        }
    }

    /* =========================================
       6. LISTENERS
    ========================================= */
    initAudio();

    window.addEventListener('keydown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    window.addEventListener('contextmenu', (e) => {
        if(isAccepted) {
            e.preventDefault(); 
            triggerWarning(e);
        }
    });

    // UPDATED: Click Listener with Navigation Callback
    window.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        
        if(isAccepted && link) {
            e.preventDefault(); // Stop immediate navigation
            
            const targetUrl = link.href;

            // Only prepare navigation if it's a real URL (not a hash anchor or empty)
            if (targetUrl && targetUrl !== '#' && !targetUrl.startsWith('javascript')) {
                triggerWarning(e, () => {
                    window.location.href = targetUrl; // Navigate AFTER audio ends
                });
            } else {
                triggerWarning(e); // Just play noise, no navigation
            }
        }
    }, true);

})();