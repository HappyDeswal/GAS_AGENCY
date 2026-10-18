export function initializeAnimations() {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches || document.documentElement.dataset.motion === 'reduced')
        return;
    document.querySelectorAll('.tilt').forEach(card => {
        card.onpointermove = e => {
            const r = card.getBoundingClientRect();
            card.style.transform = `perspective(900px) translate3d(0,-3px,0) rotateX(${-(e.clientY - r.top - r.height / 2) / 65}deg) rotateY(${(e.clientX - r.left - r.width / 2) / 85}deg)`;
        };
        card.onpointerleave = () => card.style.transform = '';
    });
}
