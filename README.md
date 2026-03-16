# Visbli Website

A modern, responsive website for Visbli built with the same design system as the admin-frontend project.

## Design System

This website uses the exact same design system as `C:\YashCreno\personal\admin-frontend`:

- **Colors**: Full CSS custom properties system with light/dark mode support
- **Typography**: Poppins font family with proper fallbacks
- **Shadows**: Custom shadow system (2xs to 2xl)
- **Border Radius**: Consistent radius system with CSS variables
- **Spacing**: Consistent spacing system

## Project Structure

```
visbli-website/
├── index.html          # Main HTML file
├── globals.css         # Global styles with design system variables
├── script.js           # Interactive functionality
├── tailwind.config.js  # TailwindCSS configuration
├── postcss.config.js   # PostCSS configuration
├── package.json        # Project dependencies
└── README.md          # Documentation
```

## Features

- **Responsive Design**: Fully responsive layout that works on all devices
- **Dark Mode**: Toggle between light and dark themes with localStorage persistence
- **Modern UI**: Clean, professional design using the admin-frontend design system
- **Smooth Animations**: Scroll animations and interactive elements
- **Mobile Menu**: Hamburger menu for mobile navigation
- **Contact Form**: Functional contact form with validation

## Sections

1. **Navigation**: Sticky header with smooth scroll navigation
2. **Hero**: Eye-catching landing section with call-to-action buttons
3. **Services**: Grid layout showcasing company services
4. **About**: Company information with statistics
5. **Contact**: Contact form with validation
6. **Footer**: Comprehensive footer with links and social media

## Getting Started

### Option 1: Quick Start (No Build Required)
Simply open `index.html` in your web browser to view the website.

### Option 2: Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Technologies Used

- HTML5 Semantic Markup
- TailwindCSS (same config as admin-frontend)
- Vanilla JavaScript for interactions
- CSS custom properties for theming
- PostCSS for CSS processing

## Design System Compliance

✅ Uses exact same color palette as admin-frontend  
✅ Implements Poppins font family with proper fallbacks  
✅ Applies custom border radius system (var(--radius))  
✅ Uses identical shadow system and spacing  
✅ Full dark mode support with proper color variables  
✅ Matches TailwindCSS configuration structure  

## Browser Compatibility

- Chrome/Chromium (Recommended)
- Firefox
- Safari
- Edge

## CSS Linting Notes

The CSS linting warnings for `@tailwind` and `@apply` are expected when using TailwindCSS without a proper build process. These warnings don't affect functionality and can be resolved by running the build process with `npm run build-css`.

## Features Implemented

✅ Responsive grid layouts  
✅ Dark/light theme toggle  
✅ Smooth scrolling navigation  
✅ Mobile hamburger menu  
✅ Form validation  
✅ Scroll animations  
✅ Counter animations  
✅ Hover effects  
✅ Modern card designs  
✅ Gradient text effects  
✅ Custom shadows and spacing
