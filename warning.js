/* --- warning.js --- */
(function() {
    // 1. Configuration: Phrases
    const phrases = [
        "STOP", 
        "DON'T PRESS ANYTHING", 
        "NO!", 
        "YAMETEEEEEE!",        // Weeb scream
        "やめて ください!",      // Yamete kudasai
        "DAME! (ダメ)",        // No!
        "BAKA! (バカ)",        // Idiot!
        "OMAE WA MOU...",      // You are already...
        "SHINDEIRU!",          // ...Dead
        "禁止",                 // Prohibited
        "不要!",                // Don't!
        "停!",                  // Stop!
        "KYAAAAA!",            // Anime scream
        "HANDS OFF!",
        "TOUCH GRASS",
        "SYSTEM FAILURE"
    ];

    // 2. Audio Setup
    // We create a base audio object. We will clone this later for rapid-fire playback.
    const audioSrc = 'intro.wav'; 
    const baseAudio = new Audio(audioSrc);
    baseAudio.volume = 1.0; // Maximize volume (0.0 to 1.0)

    // 3. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #warning-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #ff0000;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647; /* Max CSS z-index */
            pointer-events: none; 
            opacity: 0;
            transition: opacity 0.05s ease-out; 
            text-align: center;
            overflow: hidden;
        }

        #warning-text {
            font-family: 'VT323', 'Courier New', monospace;
            font-size: 6rem;
            font-weight: 900;
            text-transform: uppercase;
            text-shadow: 5px 5px 0px #000;
            transform: scale(1);
            animation: shake 0.1s infinite;
        }

        @keyframes shake {
            0% { transform: translate(2px, 2px) rotate(0deg); }
            20% { transform: translate(-4px, 0px) rotate(2deg); }
            40% { transform: translate(4px, -2px) rotate(-2deg); }
            60% { transform: translate(-4px, 2px) rotate(0deg); }
            80% { transform: translate(2px, -2px) rotate(2deg); }
            100% { transform: translate(0px, 0px) rotate(-2deg); }
        }
    `;
    document.head.appendChild(style);

    // 4. Inject HTML
    const overlay = document.createElement('div');
    overlay.id = 'warning-overlay';
    
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    overlay.appendChild(textSpan);
    
    document.body.appendChild(overlay);

    // 5. Trigger Logic
    let hideTimeout;

    function triggerWarning(event) {
        // A. Visuals
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        textSpan.innerText = randomPhrase;

        // Random chaotic background colors
        const bgColors = ['#ff0000', '#000000', '#ff1493', '#0000ff'];
        overlay.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];

        overlay.style.opacity = '1';

        // B. Audio (The "Very Loud" Part)
        // We clone the node. This allows the sound to "stack" if keys are pressed fast.
        // If we didn't clone, the sound would restart, cutting off the previous one.
        // Stacking = Louder.
        const soundClone = baseAudio.cloneNode();
        soundClone.volume = 1.0; 
        
        // Play and catch errors (e.g., if user hasn't interacted with page yet)
        soundClone.play().catch(e => console.log("Audio waiting for interaction..."));

        // C. Timer
        if (hideTimeout) clearTimeout(hideTimeout);

        // Hide after 250ms
        hideTimeout = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 100);
    }

    // 6. Listeners
    window.addEventListener('keydown', (e) => {
        triggerWarning(e);
    });

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        triggerWarning(e);
    });

})();