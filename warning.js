/* --- warning.js --- */
(function() {
    // 1. Configuration: The list of random aggressive/weeb phrases
    const phrases = [
        "STOP", 
        "DON'T PRESS ANYTHING", 
        "NO!", 
        "YAMETEEEEEE!",        // Weeb scream
        "やめて ください!",      // Yamete kudasai (Please stop)
        "DAME! (ダメ)",        // No!
        "BAKA! (バカ)",        // Idiot!
        "OMAE WA MOU...",      // You are already...
        "SHINDEIRU!",          // ...Dead
        "禁止",                 // Prohibited (Chinese/Japanese)
        "不要!",                // Don't! (Chinese)
        "停!",                  // Stop! (Chinese)
        "KYAAAAA!",            // Anime scream
        "HANDS OFF!",
        "TOUCH GRASS INSTEAD",
        "ERROR 404: BRAIN NOT FOUND"
    ];

    // 2. Inject CSS for the overlay
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
            z-index: 999999; /* Higher than everything */
            pointer-events: none; /* Let clicks pass through if needed, though we block them */
            opacity: 0;
            transition: opacity 0.05s ease-out; /* Super fast fade in/out */
            text-align: center;
            overflow: hidden;
        }

        #warning-text {
            font-family: 'VT323', 'Impact', monospace; /* Uses your site's font */
            font-size: 5rem;
            font-weight: bold;
            text-transform: uppercase;
            text-shadow: 4px 4px 0px #000000;
            transform: scale(1);
            animation: shake 0.2s infinite;
        }

        @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
    `;
    document.head.appendChild(style);

    // 3. Inject HTML for the overlay
    const overlay = document.createElement('div');
    overlay.id = 'warning-overlay';
    
    const textSpan = document.createElement('span');
    textSpan.id = 'warning-text';
    overlay.appendChild(textSpan);
    
    document.body.appendChild(overlay);

    // 4. Logic to handle triggers
    let hideTimeout;

    function triggerWarning(event) {
        // Pick a random phrase
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        textSpan.innerText = randomPhrase;

        // Random background color for extra chaos (Red, Black, or Deep Pink)
        const bgColors = ['#ff0000', '#000000', '#ff1493'];
        overlay.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];

        // Show overlay
        overlay.style.opacity = '1';

        // Clear existing timer if user spams keys
        if (hideTimeout) clearTimeout(hideTimeout);

        // Hide after 250ms (1/4 second)
        hideTimeout = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 250);
    }

    // 5. Event Listeners
    
    // Trigger on any keydown
    window.addEventListener('keydown', (e) => {
        // Optional: Ignore specific keys like F5 or Ctrl+R (Reload) if you want to be nice
        // if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) return; 
        
        triggerWarning(e);
    });

    // Trigger on right click
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // This blocks the actual right-click menu
        triggerWarning(e);
    });

})();