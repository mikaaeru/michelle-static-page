/* --- warning_optimized.js --- */
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
        'intro1.wav', 
        'intro2.wav', 
        'intro3.wav', 
        'intro4.wav'
    ];

    // LOUDNESS CONFIG
    // 1.0 is normal. 3.0+ is very loud. 
    // We use a GainNode to boost volume cleanly instead of stacking files (which causes lag).
    const VOLUME_GAIN = 5.0; 

    /* =========================================
       2. STATE MANAGEMENT
    ========================================= */
    let audioContext = null;
    let audioBuffers = [];
    let isPlaying = false; // Blocks input while sound plays
    let isAccepted = false; // Blocks input until "ACCEPT" is clicked
    let lastAudioIndex = -1;
    let hideTimeout;

    /* =========================================
       3. UI & CSS INJECTION
    ========================================= */
    const style = document.createElement('style');
    style.innerHTML = `
        /* The main flashing warning overlay */
        #warning-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #ff0000; color: #ffffff;
            display: flex; justify-content: center; align-items: center;
            z-index: 2147483646; /* High, but below the accept button */
            pointer-events: none; opacity: 0;
            transition: opacity 0.1s ease-out;
            overflow: hidden;
        }
        #warning-text {
            font-family: 'Courier New', monospace; font-size: 6rem;
            font-weight: 900; text-transform: uppercase;
            text-shadow: 5px 5px 0px #000;
            animation: shake 0.1s infinite;
        }

        /* The "Accept" Modal */
        #accept-modal {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #000000; color: #00ff00;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            z-index: 2147483647; /* Maximum Priority */
            font-family: 'Courier New', monospace;
        }
        #accept-btn {
            margin-top: 20px; padding: 15px 30px;
            font-size: 1.5rem; background: #00ff00; color: #000;
            border: none; cursor: pointer; text-transform: uppercase;
            font-weight: bold;
        }
        #accept-btn:disabled {
            background: #333; color: #555; cursor: wait;
        }
        #accept-btn:hover:not(:disabled) {
            background: #fff;
        }
        
        @keyframes shake {
            0% { transform: translate(2px, 2px) rotate(0deg); }
            100% { transform: translate(-2px, -2px) rotate(-2deg); }
        }
    `;
    document.head.appendChild(style);

    // Create Warning Overlay
    const overlay = document.createElement('div');
    overlay.id = 'warning-overlay';
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    overlay.appendChild(textSpan);
    document.body.appendChild(overlay);

    // Create Accept Modal
    const modal = document.createElement('div');
    modal.id = 'accept-modal';
    modal.innerHTML = `
        <h1>WARNING: LOUD AUDIO</h1>
        <p>This site contains sudden loud noises and flashing lights.</p>
        <p id="loading-text">Loading Audio Assets...</p>
        <button id="accept-btn" disabled>Loading...</button>
    `;
    document.body.appendChild(modal);

    /* =========================================
       4. AUDIO ENGINE (WEB AUDIO API)
    ========================================= */
    async function initAudio() {
        // Create context only once
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        const loadBtn = document.getElementById('accept-btn');
        const loadText = document.getElementById('loading-text');

        try {
            // Fetch all files in parallel
            const fetchPromises = audioSources.map(src => fetch(src));
            const responses = await Promise.all(fetchPromises);
            
            // Convert to ArrayBuffers
            const bufferPromises = responses.map(res => res.arrayBuffer());
            const arrayBuffers = await Promise.all(bufferPromises);

            // Decode Audio Data
            const decodePromises = arrayBuffers.map(buf => audioContext.decodeAudioData(buf));
            audioBuffers = await Promise.all(decodePromises);

            // Ready UI
            loadText.innerText = "Assets Loaded. Proceed with caution.";
            loadBtn.innerText = "I ACCEPT THE RISK";
            loadBtn.disabled = false;
            
            // Setup Accept Click
            loadBtn.addEventListener('click', () => {
                // Determine if context is suspended (browser policy) and resume
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                modal.style.display = 'none';
                isAccepted = true;
            });

        } catch (error) {
            loadText.innerText = "Error loading audio files. Check console.";
            console.error("Audio Load Error:", error);
        }
    }

    // Play function using Web Audio API nodes
    function playSound(buffer) {
        if (!audioContext) return;

        // 1. Create Source
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // 2. Create Gain (Volume) Node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = VOLUME_GAIN; // Make it super loud

        // 3. Connect: Source -> Gain -> Speakers
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 4. Play
        source.start(0);

        // 5. Handle "Done Playing"
        source.onended = () => {
            isPlaying = false; // Release the lock
            // Immediately hide visuals when audio stops
            overlay.style.opacity = '0'; 
        };
    }

    /* =========================================
       5. TRIGGER LOGIC
    ========================================= */
    function triggerWarning(event) {
        // Safety Checks:
        if (!isAccepted) return; // Haven't clicked accept yet
        if (isPlaying) return;   // Audio is still playing
        
        isPlaying = true; // Lock inputs immediately

        // A. Visuals
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        textSpan.innerText = randomPhrase;

        const bgColors = ['#ff0000', '#000000', '#ff00ff', '#0000ff'];
        overlay.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];
        overlay.style.opacity = '1';

        // B. Audio Selection (No Repeats)
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioBuffers.length);
        } while (newIndex === lastAudioIndex && audioBuffers.length > 1);
        lastAudioIndex = newIndex;

        // C. Play
        if (audioBuffers[newIndex]) {
            playSound(audioBuffers[newIndex]);
        } else {
            // Fallback if buffer missing
            isPlaying = false;
        }
    }

    /* =========================================
       6. LISTENERS
    ========================================= */
    
    // Initialize loading immediately
    initAudio();

    // 1. Keyboard
    window.addEventListener('keydown', (e) => {
        if(isAccepted) triggerWarning(e);
    });

    // 2. Right Click
    window.addEventListener('contextmenu', (e) => {
        if(isAccepted) {
            e.preventDefault(); 
            triggerWarning(e);
        }
    });

    // 3. Link Clicks
    window.addEventListener('click', (e) => {
        if(isAccepted && e.target.closest('a')) {
             e.preventDefault(); // Stop link navigation to ensure audio plays
             triggerWarning(e);
        }
    }, true);

})();