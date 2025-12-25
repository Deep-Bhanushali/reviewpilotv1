# Online Reviewer System - Product Requirements Document (PRD)

## Executive Summary

The Online Reviewer System is a comprehensive order management platform designed for review-based earning models. Users purchase products through mediators, submit reviews on e-commerce platforms, and receive refunds. The system automates tracking, provides intelligent notifications, and integrates with Google Calendar for deadline management.

---

## Product Overview

### Vision
To create a streamlined, automated system that simplifies the review-based earning process by eliminating manual tracking and providing intelligent insights into order management.

### Target Users
- Individual reviewers who purchase products and submit reviews for refunds
- Small teams managing multiple review operations
- Anyone involved in systematic product review processes across Indian e-commerce platforms

### Key Value Propositions
1. **Automated Tracking**: No manual spreadsheets - everything is tracked automatically
2. **Smart Notifications**: Never miss deadlines with intelligent alerts
3. **Calendar Integration**: Automatic deadline sync with Google Calendar
4. **Complete Audit Trail**: Track every change with detailed activity logs
5. **Multi-Platform Support**: Works with 8 major Indian e-commerce platforms

---

## Core Features Implemented

### 1. **Order Management System**

#### 1.1 Order Lifecycle Tracking
- **8-Stage Status Flow**: 
  - Ordered → Shipped → Out for Delivery → Delivered → Review & Rating Completed → Deliverables Done → Refund Form Submitted → Refunded
  - Plus special statuses: "Overdue Passed for Refund Form" and "Remind Mediator for Payment"

- **Comprehensive Order Data**:
  - Product information (name, link, platform)
  - Financial tracking (order amount, refund amount in paise)
  - Timeline management (order date, delivery date, refund form date)
  - Mediator and account association
  - Custom comments and notes

- **Dashboard Analytics**:
  - Monthly earnings calculation
  - Order count metrics
  - Status-based filtering
  - Real-time statistics

#### 1.2 Multi-Platform Support
Integrated with 8 major Indian e-commerce platforms:
- Amazon
- Flipkart
- Myntra
- Meesho
- Ajio
- Nykaa
- Paytm Mall
- Snapdeal

### 2. **Mediator Management**

- Create and manage third-party dealer relationships
- Store contact information (name, WhatsApp number)
- Track earnings per mediator
- Associate orders with specific mediators

### 3. **Account Management**

- Manage multiple e-commerce platform accounts
- Store account credentials and details
- Link accounts to specific platforms
- Track orders per account

### 4. **Smart Notifications System**

#### 4.1 Automatic Notification Generation
Notifications are automatically created for:

**Critical Alerts**:
- Overdue refund form deadlines
- Products delivered but no review after 3 days

**Warning Alerts**:
- Delivery expected within 3 days
- Refund form due within 3 days

**Info/Success Alerts**:
- New order created
- Product delivered
- Review completed
- Payment reminder needed
- Refund received

#### 4.2 Notification Management
- Filter by type (Critical, Warning, Info, Success)
- Mark as read/unread
- Quick actions (View Order, Message Mediator)
- Real-time notification count in navigation

### 5. **Activity Log System**

#### 5.1 Comprehensive Audit Trail
Automatically tracks all changes:
- Order Created
- Status Changed (with before/after values)
- Dates Modified (delivery, refund form, payment reminder)
- Order Updated (any other field changes)
- Calendar Event Created/Updated/Deleted

#### 5.2 Activity Log Features
- Per-order timeline view
- Filter by order
- Filter by activity type
- Date range filtering
- User-friendly descriptions with icons
- Relative timestamps ("2 hours ago")

### 6. **Google Calendar Integration**

#### 6.1 Automatic Event Creation
When an order has a delivery date, the system automatically creates:

1. **Delivery Day Event** (on delivery date)
   - Product arrival reminder
   - 10:00 AM - 11:00 AM

2. **Review Reminder** (Delivery Date + 2 days)
   - Complete rating & review
   - 2:00 PM - 3:00 PM

3. **Refund Form Reminder** (when refund form date is set)
   - Submit refund form
   - 3:00 PM - 4:00 PM
   - Includes form link if provided

#### 6.2 Smart Event Management
- Updates existing events instead of creating duplicates
- Deletes calendar events when:
  - Order is deleted
  - Delivery date is cleared
  - Refund form date is removed
- Stores calendar event IDs for proper lifecycle management
- Email and popup reminders (24 hours and 1 hour before)

#### 6.3 Settings Integration
- Enable/disable calendar sync from Settings
- Connect Google Calendar via OAuth
- Test connection button to verify setup
- Visual event timeline preview

### 7. **Data Import/Export**

#### 7.1 CSV Import
- Bulk order import via CSV
- Personalized template with user's actual account and mediator IDs
- Template generation endpoint
- Validation and error handling

#### 7.2 Calendar Export
- Download order timeline as ICS file
- Compatible with all calendar applications
- Includes all order milestones

### 8. **Authentication & Security**

- Replit OIDC authentication
- PostgreSQL-backed session management
- Secure Google OAuth integration
- HTTP-only cookies with secure flags
- Environment-based secret management

### 9. **User Interface**

#### 9.1 Design System
- Modern, professional slate/indigo color scheme
- Mobile-first responsive design
- Dark mode support (via system CSS variables)
- Smooth animations and transitions
- shadcn/ui component library

#### 9.2 Navigation
- Persistent sidebar with icons
- Active route highlighting
- Quick access to all major sections:
  - Dashboard
  - Orders
  - Accounts
  - Mediators
  - Activity Log
  - Notifications
  - Settings

#### 9.3 Smart Dashboard Card
- Analyzes all orders in real-time
- Highlights orders needing immediate attention
- Shows upcoming deadlines
- Displays overdue items
- Color-coded by urgency (critical/warning/info)

### 10. **Settings & Preferences**

#### 10.1 Profile Management
- User information updates
- Timezone settings
- Language preferences

#### 10.2 Notification Settings
- Email notifications toggle
- Push notifications toggle
- SMS notifications toggle
- Granular controls:
  - Order delivered alerts
  - Refund form due reminders
  - Payment received notifications
  - Order delayed warnings
  - Weekly summary reports

#### 10.3 Calendar Integration Settings
- Enable/disable calendar sync
- Connect Google Calendar
- Test connection functionality
- Configure which events to create:
  - Order events
  - Delivery reminders
  - Refund reminders

#### 10.4 Messaging Templates
- WhatsApp message templates for mediators
- Three template styles:
  - Default (simple and clear)
  - Friendly (casual with emojis)
  - Professional (formal business tone)
- Template variables for personalization

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query v5 (React Query)
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: TailwindCSS with custom properties
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React, React Icons

### Backend Stack
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with type-safe schemas
- **Authentication**: Passport.js with Replit OIDC
- **Session Store**: PostgreSQL via connect-pg-simple

### External Integrations
- **Google Calendar API**: Event management and sync
- **Google OAuth 2.0**: Secure calendar authorization
- **Replit Authentication**: User identity management

### Database Schema
- **users**: User profiles with OIDC compatibility
- **user_settings**: Calendar and notification preferences
- **mediators**: Third-party dealer information
- **accounts**: E-commerce platform credentials
- **orders**: Complete order lifecycle data with calendar event IDs (JSONB)
- **activity_logs**: Audit trail with enum-based activity types
- **notifications**: System alerts with type classification
- **sessions**: Secure session persistence

### Business Logic
- **Currency Handling**: Integer-based storage in paise (no floating-point errors)
- **Activity Logging**: Automatic tracking on all order mutations
- **Notification Generation**: Event-driven on status changes
- **Calendar Sync**: Lifecycle-aware (create/update/delete)
- **Smart Notifications**: Real-time order analysis for dashboard

---

## User Workflows

### Workflow 1: Creating a New Order
1. User navigates to Orders page
2. Clicks "Add New Order" button
3. Fills in order details:
   - Selects mediator from dropdown
   - Selects account from dropdown
   - Enters product name and platform
   - Enters order ID and amounts
   - Sets dates (order, delivery, refund form)
4. Submits form
5. System automatically:
   - Creates order in database
   - Logs "Order Created" activity
   - Creates notification "New Order Created"
   - If delivery date set & calendar enabled: Creates 3 calendar events
   - Refreshes order list

### Workflow 2: Updating Order Status
1. User clicks on order card
2. Opens order details modal
3. Changes status dropdown (e.g., "Ordered" → "Delivered")
4. Saves changes
5. System automatically:
   - Updates order in database
   - Logs "Status Changed" activity with old/new values
   - Creates status-specific notification (e.g., "Product Delivered")
   - Updates calendar events if dates changed

### Workflow 3: Google Calendar Connection
1. User goes to Settings → Calendar Integration
2. Toggles "Enable Calendar Integration" to ON
3. Clicks "Connect Google Calendar"
4. Redirected to Google OAuth consent screen
5. Authorizes calendar access
6. Redirected back to app
7. Calendar tokens stored securely
8. User can click "Test Connection" to verify
9. All future orders with delivery dates auto-sync to calendar

### Workflow 4: Viewing Activity History
1. User navigates to Activity Log page
2. Sees complete timeline of all changes
3. Can filter by:
   - Specific order
   - Activity type (Created, Status Changed, Dates Modified, etc.)
   - Date range (future enhancement)
4. Each activity shows:
   - Icon and color-coded type
   - Description
   - Old/New values (if applicable)
   - Relative timestamp
   - Associated order details

### Workflow 5: Managing Notifications
1. User clicks Notifications icon in sidebar (shows count badge)
2. Sees all notifications with filters:
   - All / Unread / Critical / Today
   - Search by title/message
3. Can perform actions:
   - Mark as Read
   - View Order (navigates to order)
   - Message Mediator (opens WhatsApp)
4. Critical notifications highlighted in red
5. New notifications shown with "New" badge

---

## Future Scope & Roadmap

### Phase 1: Enhanced Automation (Q1 2025)

#### 1.1 Intelligent Deadline Prediction
- ML-based delivery date prediction
- Platform-specific shipping patterns
- Automatic deadline adjustment based on holidays

#### 1.2 WhatsApp Integration
- Direct messaging to mediators from app
- Automated message templates
- Message history tracking
- Read receipts and status updates

#### 1.3 Payment Tracking
- Payment status tracking
- Multiple payment methods (UPI, Bank Transfer, Cash)
- Payment proof upload
- Automated payment reminders

### Phase 2: Advanced Analytics (Q2 2025)

#### 2.1 Earnings Dashboard
- Visual earnings trends (charts/graphs)
- Platform-wise breakdown
- Mediator performance comparison
- Monthly/quarterly/yearly reports

#### 2.2 Predictive Analytics
- Success rate predictions
- Optimal review timing suggestions
- Mediator reliability scoring
- Platform-specific insights

#### 2.3 Export & Reporting
- PDF report generation
- Excel export with formulas
- Custom report builder
- Scheduled email reports

### Phase 3: Collaboration Features (Q3 2025)

#### 3.1 Team Management
- Multi-user accounts
- Role-based access control (Admin, Reviewer, Viewer)
- Shared order pools
- Task assignment system

#### 3.2 Mediator Portal
- Dedicated mediator login
- Order visibility for their assignments
- Payment request submission
- Performance analytics

#### 3.3 Communication Hub
- In-app messaging
- File sharing (receipts, screenshots)
- Comment threads on orders
- @mentions and notifications

### Phase 4: Mobile Experience (Q4 2025)

#### 4.1 Progressive Web App (PWA)
- Offline functionality
- Install to home screen
- Push notifications (native)
- Camera integration for receipts

#### 4.2 Mobile Optimizations
- Touch-friendly interface
- Swipe gestures for actions
- Bottom navigation
- Quick actions menu

### Phase 5: Integrations & Automation (2026)

#### 5.1 E-commerce Platform Integration
- Direct order import from Amazon, Flipkart
- Automatic status updates via APIs
- Review submission tracking
- Refund status monitoring

#### 5.2 Banking Integration
- Automatic payment reconciliation
- Bank statement import
- UPI payment tracking
- Tax calculation and filing support

#### 5.3 AI Assistant
- Natural language order creation
- Smart suggestions based on history
- Automated review writing assistance
- Chatbot for common queries

### Phase 6: Advanced Features (2026+)

#### 6.1 Fraud Detection
- Suspicious pattern detection
- Mediator reliability alerts
- Duplicate order prevention
- Automated verification workflows

#### 6.2 Compliance & Legal
- GST calculation and invoicing
- Tax report generation
- Regulatory compliance tracking
- Audit trail export

#### 6.3 Marketplace
- Mediator marketplace
- Product opportunity listing
- Rating and review system
- Dispute resolution

---

## Technical Enhancements Roadmap

### Performance Optimizations
- Database query optimization with indexes
- Redis caching layer for frequently accessed data
- Image optimization and CDN integration
- Lazy loading and code splitting

### Security Enhancements
- Two-factor authentication (2FA)
- Audit log encryption
- Rate limiting and DDoS protection
- Regular security audits and penetration testing

### Scalability Improvements
- Microservices architecture migration
- Load balancing and auto-scaling
- Database sharding for large datasets
- Event-driven architecture with message queues

### Developer Experience
- API documentation (OpenAPI/Swagger)
- SDK for third-party integrations
- Webhook support for external systems
- GraphQL API alongside REST

---

## Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Orders created per user per month
- Notification click-through rate
- Calendar integration adoption rate

### System Performance
- Order creation time < 500ms
- Page load time < 2 seconds
- Calendar sync success rate > 99%
- System uptime > 99.9%

### Business Impact
- Time saved per order (vs manual tracking)
- Missed deadline reduction rate
- User satisfaction score (NPS)
- Platform growth rate (MoM)

---

## Known Limitations & Workarounds

### Current Limitations

1. **Google Calendar OAuth Configuration**
   - **Issue**: Redirect URI must be manually configured in Google Cloud Console
   - **Workaround**: Provide setup documentation to users
   - **Future**: Implement automated OAuth app registration

2. **Manual Platform Tracking**
   - **Issue**: No direct API integration with e-commerce platforms
   - **Workaround**: Users manually update order status
   - **Future**: Implement platform API integrations (Phase 5)

3. **Single User Focus**
   - **Issue**: No multi-user or team features
   - **Workaround**: Each user creates separate account
   - **Future**: Team management (Phase 3)

4. **Limited Payment Tracking**
   - **Issue**: No automated payment reconciliation
   - **Workaround**: Manual payment status updates
   - **Future**: Banking integration (Phase 5)

5. **No Mobile App**
   - **Issue**: Web-only experience
   - **Workaround**: Responsive design works on mobile browsers
   - **Future**: PWA and native apps (Phase 4)

---

## Conclusion

The Online Reviewer System has successfully implemented a comprehensive order management platform with intelligent automation, smart notifications, and seamless calendar integration. The system eliminates manual tracking, reduces missed deadlines, and provides complete visibility into the review-based earning workflow.

With a solid foundation in place, the roadmap focuses on enhanced automation, advanced analytics, team collaboration, and platform integrations to create an industry-leading solution for review management.

---

## Appendix

### A. Technology Stack Details

#### Frontend Dependencies
- @tanstack/react-query: Server state management
- wouter: Routing
- react-hook-form: Form handling
- @radix-ui/*: UI primitives
- lucide-react: Icons
- date-fns: Date utilities
- zod: Validation

#### Backend Dependencies
- express: Web framework
- drizzle-orm: Database ORM
- passport: Authentication
- google-auth-library: Google OAuth
- googleapis: Calendar API
- connect-pg-simple: Session storage

#### Development Tools
- TypeScript: Type safety
- Vite: Build tool
- Tailwind CSS: Styling
- ESLint: Code quality

### B. Database Relationships

```
users (1) ──→ (many) user_settings
users (1) ──→ (many) mediators
users (1) ──→ (many) accounts
users (1) ──→ (many) orders
users (1) ──→ (many) notifications
users (1) ──→ (many) activity_logs

mediators (1) ──→ (many) orders
accounts (1) ──→ (many) orders
orders (1) ──→ (many) notifications
orders (1) ──→ (many) activity_logs
```

### C. API Endpoints Summary

**Authentication**
- GET /api/auth/user
- GET /api/login
- GET /api/logout

**Orders**
- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- PUT /api/orders/:id
- DELETE /api/orders/:id

**Mediators**
- GET /api/mediators
- POST /api/mediators
- PUT /api/mediators/:id
- DELETE /api/mediators/:id

**Accounts**
- GET /api/accounts
- POST /api/accounts
- PUT /api/accounts/:id
- DELETE /api/accounts/:id

**Notifications**
- GET /api/notifications
- POST /api/notifications
- PUT /api/notifications/:id/read
- PUT /api/notifications/read-all

**Activity Logs**
- GET /api/activity-logs

**Calendar**
- GET /api/calendar/auth
- GET /api/calendar/test
- GET /api/auth/google/callback
- POST /api/calendar/events
- GET /api/calendar/export/:orderId

**Settings**
- GET /api/user-settings
- PUT /api/user-settings

**Dashboard**
- GET /api/dashboard/stats

**Import/Export**
- GET /order-import-template.csv
- POST /api/import/orders

---

*Document Version: 1.0*  
*Last Updated: October 2025*  
*Prepared by: Development Team*
