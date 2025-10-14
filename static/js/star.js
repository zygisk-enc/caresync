document.addEventListener('DOMContentLoaded', () => {
    // --- Starfield Background Logic ---
    const starfield = document.getElementById('starfield-container');
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
});
