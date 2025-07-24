document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Navigation Toggle ---
    // This makes the hamburger menu work on mobile devices.
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // --- Sticky Header on Scroll ---
    // This adds a solid background to the header when you scroll down.
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Typewriter Effect ---
    // This creates the animated typing in the hero section.
    const typewriterElement = document.getElementById('typewriter');
    const roles = ["Aspiring Software Engineer", "Full-Stack Web Developer", "Future Data Scientist"];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentRole = roles[roleIndex];
        if (isDeleting) {
            // Deleting characters
            typewriterElement.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
        } else {
            // Typing characters
            typewriterElement.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
        }

        // Logic to switch between typing and deleting
        if (!isDeleting && charIndex === currentRole.length) {
            // Pause at the end of the word
            setTimeout(() => { isDeleting = true; }, 2000);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
        }
        
        // Set the speed of typing/deleting
        const typingSpeed = isDeleting ? 75 : 150;
        setTimeout(type, typingSpeed);
    }
    type();

    // --- Scroll Reveal Animation ---
    // This makes sections fade in as you scroll to them.
    // It uses the Intersection Observer API for better performance.
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing after it's visible
                // observer.unobserve(entry.target); 
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // --- Contact Form Handling ---
    // This validates the form and shows a success message without sending an email.
    const contactForm = document.getElementById('contact-form');
    const formMessage = document.getElementById('form-message');

    contactForm.addEventListener('submit', function(e) {
        // Prevent the default form submission behavior
        e.preventDefault();

        // Get form data
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        
        // Simple validation
        if (name === '' || email === '' || message === '') {
            formMessage.textContent = 'Please fill out all fields.';
            formMessage.style.color = '#ff6b6b'; // A reddish color for errors
            return;
        }

        // On successful validation, show a success message
        formMessage.textContent = 'Thank you for your message!';
        formMessage.style.color = 'var(--primary-color)';
        
        // Clear the form fields
        contactForm.reset();
    });
});
