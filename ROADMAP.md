# EveryPoll Development Roadmap

This roadmap outlines the step-by-step development process for building the EveryPoll application. Each step represents one PR that will implement specific features of the application as defined in the README.md.

## PR 1: Project Setup and Initial Infrastructure

**Goal:** Set up the basic project structure and infrastructure.

**Tasks:**
- Initialize the project structure (already done with mentat-template-js)
- Update package.json with necessary dependencies
- Create initial SQLite database setup with migrations system
- Implement basic database schema (Users, Polls, Answers, Votes tables)
- Set up basic routes in Express server
- Create placeholder React components for main pages
- Update HTML title and favicon

**Deliverables:**
- Working application skeleton with database connection
- Basic routing between pages
- Placeholder UI components
- Tests for database connection and schema

## PR 2: User Authentication with Google

**Goal:** Implement Google user authentication and session management.

**Tasks:**
- Add Google OAuth 2.0 integration
- Implement user authentication routes (/api/auth/*)
- Create user session management
- Implement login/logout functionality
- Add middleware for protected routes
- Create UI components for login/avatar display

**Deliverables:**
- Working Google authentication flow
- Session management
- Login/logout functionality
- Protected routes
- Tests for authentication flow

## PR 3: Poll Creation and Basic Viewing

**Goal:** Allow users to create polls and view them individually.

**Tasks:**
- Create poll creation form with dynamic answer options
- Implement poll creation API endpoint
- Create individual poll view page
- Implement API endpoint to fetch a single poll
- Add validation for poll creation (2-10 answers)
- Update database schema as needed

**Deliverables:**
- Poll creation form for authenticated users
- Individual poll viewing page
- API endpoints for poll creation and retrieval
- Tests for poll creation and viewing

## PR 4: Voting System and Results Visualization

**Goal:** Enable users to vote on polls and see results.

**Tasks:**
- Implement voting API endpoint
- Add vote button UI in the poll card
- Create results visualization with column chart
- Update polls to show different UI before/after voting
- Add vote count display
- Implement authentication check for voting

**Deliverables:**
- Voting functionality for authenticated users
- Results visualization with column charts
- Vote counts display
- Tests for voting and results display

## PR 5: Poll Feed and Landing Page

**Goal:** Create the main feed page with infinite scroll.

**Tasks:**
- Implement poll feed on landing page
- Add infinite scroll functionality
- Create header with logo and navigation
- Implement poll card component for the feed
- Create API endpoint for paginated poll feed
- Add sorting options (newest first)

**Deliverables:**
- Landing page with poll feed
- Infinite scroll functionality
- Header with navigation
- Tests for feed and pagination

## PR 6: Search Functionality

**Goal:** Add search capabilities to find polls.

**Tasks:**
- Add search bar in header
- Implement search API endpoint
- Create search results display
- Update feed to show search results
- Add search functionality in poll cross-referencing

**Deliverables:**
- Search functionality throughout the application
- API endpoint for search
- Tests for search functionality

## PR 7: Cross-referencing Polls

**Goal:** Implement the ability to cross-reference polls.

**Tasks:**
- Add cross-reference search bar in poll cards
- Implement API endpoint for cross-referenced poll data
- Create visualization for cross-referenced results
- Add selection mechanism for cross-referenced polls
- Implement nested cross-referencing UI

**Deliverables:**
- Cross-referencing functionality between polls
- Visualization of cross-referenced results
- Tests for cross-referencing functionality

## PR 8: User Profiles

**Goal:** Create user profile pages with tabs for created and voted polls.

**Tasks:**
- Implement user profile page
- Create tabs for polls created and voted on
- Add feed of polls for each tab
- Implement API endpoints for user's polls
- Add logout functionality in user profile

**Deliverables:**
- User profile page with tabs
- Feeds of created and voted polls
- Logout functionality
- Tests for user profile features

## PR 9: UI/UX Improvements

**Goal:** Enhance the user interface and experience.

**Tasks:**
- Improve overall styling and consistency
- Add responsive design for mobile and tablet
- Implement loading states and indicators
- Add error handling and user feedback
- Improve accessibility

**Deliverables:**
- Polished and responsive UI
- Improved user experience
- Better error handling
- Accessibility improvements
- Tests for UI components

## PR 10: Final Integration and Deployment Preparation

**Goal:** Finalize the application, perform comprehensive testing, and prepare for deployment.

**Tasks:**
- Perform end-to-end testing
- Add database indices for performance
- Optimize frontend bundle size
- Update documentation
- Finalize deployment configuration

**Deliverables:**
- Fully tested application
- Performance optimizations
- Complete documentation
- Deployment-ready application
- Comprehensive test suite
