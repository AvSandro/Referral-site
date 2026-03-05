// High-end Interaction Script for NT Estate Partners
// Handles scroll reveals, staggered animations, and smooth scrolling

(function() {
    'use strict';

    // ============================================
    // INTERSECTION OBSERVER FOR SCROLL REVEALS
    // ============================================

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Apply reveal animation to major sections
    const revealElements = document.querySelectorAll(
        '.hero, .divider-section, .how-it-works, .contact-section'
    );
    revealElements.forEach((el) => {
        revealObserver.observe(el);
    });

    // ============================================
    // STAGGERED CARD REVEALS
    // ============================================

    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.step');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('reveal-staggered');
                    }, index * 200); // 200ms stagger between each card
                });
                staggerObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const stepsGrid = document.querySelector('.steps-grid');
    if (stepsGrid) {
        staggerObserver.observe(stepsGrid);
    }

    // ============================================
    // SMOOTH SCROLL BEHAVIOR (Enhanced)
    // ============================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && !href.includes('mailto')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // ============================================
    // MAGNETIC HOVER EFFECT (Optional Enhancement)
    // ============================================

    const interactiveElements = document.querySelectorAll('.btn-ghost, .contact-card');
    
    interactiveElements.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Subtle transform based on mouse position (very restrained)
            const xPercent = (x / rect.width - 0.5) * 2;
            const yPercent = (y / rect.height - 0.5) * 2;
            
            // Apply minimal transform (for polish, not dramatic)
            el.style.setProperty('--mouse-x', `${xPercent * 0.5}px`);
            el.style.setProperty('--mouse-y', `${yPercent * 0.5}px`);
        });

        el.addEventListener('mouseleave', () => {
            el.style.setProperty('--mouse-x', '0px');
            el.style.setProperty('--mouse-y', '0px');
        });
    });

    // ============================================
    // FADE IN ON PAGE LOAD
    // ============================================

    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });

    // Initialize page with subtle fade-in
    document.body.style.opacity = '0.95';
})();
