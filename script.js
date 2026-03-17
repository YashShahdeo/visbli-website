// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
const isAuthed = () => localStorage.getItem('visbli_authed') === 'true';

// Check for saved theme preference or default to light
const currentTheme = localStorage.getItem('theme') || 'light';
html.classList.toggle('dark', currentTheme === 'dark');

// Theme toggle functionality
themeToggle?.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update icon
    const icon = themeToggle.querySelector('svg');
    if (isDark) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    } else {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    }
});

// Pricing toggle functionality
const pricingToggle = document.getElementById('pricing-toggle');
let isAnnual = false;

pricingToggle?.addEventListener('click', () => {
    isAnnual = !isAnnual;
    
    // Toggle the switch position
    const toggleSpan = pricingToggle.querySelector('span');
    if (isAnnual) {
        toggleSpan.classList.remove('translate-x-1');
        toggleSpan.classList.add('translate-x-6');
        pricingToggle.classList.add('bg-primary');
        pricingToggle.classList.remove('bg-muted');
    } else {
        toggleSpan.classList.remove('translate-x-6');
        toggleSpan.classList.add('translate-x-1');
        pricingToggle.classList.remove('bg-primary');
        pricingToggle.classList.add('bg-muted');
    }
    
    // Toggle monthly/annual prices
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const annualPrices = document.querySelectorAll('.annual-price');
    
    monthlyPrices.forEach(price => {
        price.classList.toggle('hidden', isAnnual);
    });
    
    annualPrices.forEach(price => {
        price.classList.toggle('hidden', !isAnnual);
    });
});

// Login and Signup button handlers
document.addEventListener('DOMContentLoaded', () => {
    const path = (window.location.pathname || '').toLowerCase();
    const isPricingPage = path === '/pricing' || path.endsWith('/pricing.html') || path.endsWith('/pricing/');

    // Delegate so it also works for dynamically created mobile menu buttons
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a');
        if (!target) return;

        const label = normalize(target.textContent);

        if (label === 'Login') {
            e.preventDefault();
            window.location.href = '/login.html';
        }

        if (label === 'Sign Up') {
            e.preventDefault();
            window.location.href = '/signup.html';
        }
    });
    
    // Product card "Learn More" buttons
    const productButtons = document.querySelectorAll('button:not([id])');
    productButtons.forEach(button => {
        if (button.textContent === 'Learn More') {
            button.addEventListener('click', () => {
                const productCard = button.closest('.bg-background');
                const productName = productCard.querySelector('h3').textContent;
                alert(`Learn more about ${productName}. This would navigate to the product detail page.`);
            });
        }
    });
    
    // Start Free Trial and Watch Demo buttons
    const trialBtn = Array.from(document.querySelectorAll('button')).find(btn => normalize(btn.textContent) === 'Start Free Trial');
    const demoBtn = Array.from(document.querySelectorAll('button')).find(btn => normalize(btn.textContent) === 'Watch Demo');
    
    if (trialBtn) {
        trialBtn.addEventListener('click', () => {
            window.location.href = '/pricing.html';
        });
    }
    
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            alert('Watch Demo - This would open a video modal or redirect to a demo page.');
        });
    }
    
    // Pricing section buttons
    const getPlanFromCta = (ctaButton) => {
        const card = ctaButton.closest('.bg-card');
        const heading = card?.querySelector('h3');
        const plan = normalize(heading?.textContent);
        return plan || '';
    };

    const pricingButtons = document.querySelectorAll('button');
    pricingButtons.forEach(button => {
        const label = normalize(button.textContent);

        if (label === 'Start Free Trial') {
            button.addEventListener('click', (e) => {
                if (!isPricingPage) return;
                if (isAuthed()) return;

                e.preventDefault();
                const plan = getPlanFromCta(button);
                const next = encodeURIComponent('/pricing.html');
                const planParam = plan ? `&plan=${encodeURIComponent(plan)}` : '';
                window.location.href = `/signup.html?redirect=${next}${planParam}`;
            });
        }

        if (label === 'Contact Sales') {
            button.addEventListener('click', () => {
                alert('Contact Sales - This would open a contact form or redirect to the sales page.');
            });
        }

        if (label === 'Schedule a Demo') {
            button.addEventListener('click', () => {
                alert('Schedule a Demo - This would open a calendar booking modal or redirect to a scheduling page.');
            });
        }
    });

    // Basic auth simulation: set a flag on login/signup submit and optionally return to a redirect URL.
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;

        const page = (window.location.pathname || '').toLowerCase();
        const isAuthPage = page.endsWith('/login.html') || page.endsWith('/signup.html') || page.endsWith('/login') || page.endsWith('/signup');
        if (!isAuthPage) return;

        e.preventDefault();
        localStorage.setItem('visbli_authed', 'true');

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect) {
            window.location.href = redirect;
            return;
        }

        window.location.href = '/pricing.html';
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile menu toggle
const mobileMenuButton = document.querySelector('button.md\\:hidden');
let mobileMenuOpen = false;

mobileMenuButton?.addEventListener('click', () => {
    mobileMenuOpen = !mobileMenuOpen;
    
    // Create mobile menu if it doesn't exist
    let mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu) {
        mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobile-menu';
        mobileMenu.className = 'fixed inset-0 z-50 bg-background md:hidden';
        mobileMenu.innerHTML = `
            <div class="flex justify-between items-center p-4 border-b border-border">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span class="text-primary-foreground font-bold text-sm">V</span>
                    </div>
                    <span class="font-semibold text-xl">Visbli</span>
                </div>
                <button id="close-mobile-menu" class="p-2 rounded-lg hover:bg-accent transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="p-4">
                <div class="flex flex-col space-y-4">
                    <a href="/homepage/" class="text-foreground hover:text-primary transition-colors py-2">Homepage</a>
                    <a href="/products.html" class="text-foreground hover:text-primary transition-colors py-2">Products</a>
                    <a href="/pricing.html" class="text-foreground hover:text-primary transition-colors py-2">Pricing</a>
                    <a href="/services.html" class="text-foreground hover:text-primary transition-colors py-2">Services</a>
                    <a href="/about.html" class="text-foreground hover:text-primary transition-colors py-2">About</a>
                    <a href="/contact.html" class="text-foreground hover:text-primary transition-colors py-2">Contact</a>
                    <div class="flex space-x-4 pt-4 border-t border-border">
                        <button class="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                            Login
                        </button>
                        <button class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(mobileMenu);
        
        // Add close functionality
        document.getElementById('close-mobile-menu').addEventListener('click', () => {
            mobileMenuOpen = false;
            mobileMenu.style.display = 'none';
        });
        
        // Close menu when clicking on links
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuOpen = false;
                mobileMenu.style.display = 'none';
            });
        });
    }
    
    mobileMenu.style.display = mobileMenuOpen ? 'block' : 'none';
});

// Form submission
const contactForm = document.querySelector('form');
contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Here you would normally send the data to a server
    // For now, we'll just show a success message
    alert('Thank you for your message! We will get back to you soon.');
    contactForm.reset();
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections for scroll animations
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Add hover effect to product cards
document.querySelectorAll('.hover\\:shadow-lg').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
        card.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Counter animation for statistics
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + (element.textContent.includes('+') ? '+' : '');
    }, 16);
}

// Initialize counters when they come into view
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.animated) {
            entry.target.animated = true;
            const text = entry.target.textContent;
            const target = parseInt(text.replace(/\D/g, ''));
            animateCounter(entry.target, target);
        }
    });
}, { threshold: 0.5 });

// Observe counter elements
document.querySelectorAll('.text-2xl.font-bold.text-primary').forEach(counter => {
    counterObserver.observe(counter);
});
