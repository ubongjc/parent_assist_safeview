# Parent Assist SafeView

**Safe, consent-based remote assistance app for helping elders and others with their devices.**

## 🎯 Overview

SafeView is a privacy-first remote assistance platform that allows helpers to view and guide users through their device screens with explicit, revocable consent. Built with safety and transparency as core principles.

### Key Features

✅ **Explicit Consent** - Every session requires clear consent from the person being helped
✅ **Big END Button** - Prominent, always-visible button to immediately terminate sessions
✅ **Time-Limited Sessions** - Automatic expiration with configurable durations
✅ **Auto-Redaction** - Client-side detection and redaction of sensitive information (passwords, OTPs)
✅ **Audit Logging** - Complete session history for security and compliance
✅ **Passkey Authentication** - WebAuthn/Passkey-first with magic link fallback
✅ **End-to-End Privacy** - Client-side encryption for sensitive data

---

## 📁 Project Structure

```
parent_assist_safeview/
├── safeview_web/        # Next.js 15 web application
└── safeview_ios/        # SwiftUI iOS application
```

---

## 🌐 Web Application (safeview_web)

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL 16 with Prisma 5
- **Auth**: Clerk (passkeys/WebAuthn + magic links)
- **Payments**: Stripe
- **Storage**: Cloudflare R2 (S3-compatible)
- **Realtime**: WebSockets/SSE + WebRTC
- **Observability**: Sentry + OpenTelemetry

### Database Schema

**Core Models:**
- `User` - User accounts with roles (HELPER, ELDER, ADMIN)
- `Room` - WebRTC assistance sessions
- `Consent` - Explicit consent tracking with status (REQUESTED, GRANTED, DENIED, REVOKED)
- `HelpLog` - Audit trail of helper actions
- `RedactionRule` - Custom auto-redaction patterns
- `Subscription` - Payment/entitlement management
- `AuditLog` - Security and compliance logging

### API Endpoints

**Health & Status:**
- `GET /api/health` - Service health check

**Room Management:**
- `POST /api/room` - Create assistance room & send consent request
- `GET /api/room` - List user's rooms (with filters)
- `POST /api/room/join` - Grant/deny consent and join room
- `POST /api/room/end` - End active session (available to both parties)

All endpoints include OpenAPI documentation comments.

### Setup Instructions

```bash
cd safeview_web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and API keys

# Initialize database (requires Postgres running)
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Key Components

**Consent UI:**
- `ConsentRequest` - Full-featured consent dialog with safety information
- `ActiveSession` - Session view with prominent END button
- Includes time remaining, session info, and safety reminders

**UI System:**
- shadcn/ui components (Button, Card)
- Tailwind for styling
- Dark mode support

---

## 📱 iOS Application (safeview_ios)

### Tech Stack

- **Framework**: SwiftUI
- **Architecture**: MVVM with Combine
- **Networking**: URLSession with async/await
- **Auth**: AuthenticationServices (Passkeys/WebAuthn)
- **Crypto**: CryptoKit for client-side encryption
- **Minimum iOS**: iOS 16+

### Architecture

```
SafeViewApp/
├── App/                 # App entry point
├── Core/
│   ├── Networking/     # API client with OpenAPI integration
│   ├── Crypto/         # Encryption utilities
│   └── Auth/           # Authentication manager
├── Features/
│   ├── Auth/           # Sign-in flows
│   ├── Consent/        # Consent request screens
│   ├── Session/        # Active session views
│   ├── Settings/       # App settings
│   └── Main/           # Main navigation
├── Models/             # Data models matching API
├── Services/           # Business logic (SessionManager)
└── Utils/              # Helper utilities
```

### Key Features

**Authentication:**
- Passkey/WebAuthn integration via `ASAuthorizationController`
- Magic link fallback
- Secure token storage in Keychain

**Session Management:**
- Real-time session duration tracking
- Automatic timer updates
- Consent lifecycle management

**Safety UI:**
- **Big Red END Button** - Fixed floating button, always accessible
- Confirmation dialogs for critical actions
- Visual session status indicators
- Auto-expiration warnings

**API Integration:**
- Type-safe OpenAPI client
- Automatic JSON encoding/decoding with ISO8601 dates
- Comprehensive error handling
- Bearer token authentication

### Setup Instructions

```bash
# Open in Xcode (requires macOS)
cd safeview_ios
open SafeViewApp.xcodeproj

# Or use xcodebuild
xcodebuild -scheme SafeViewApp -configuration Debug
```

**Configuration:**
Set environment variable for API:
- `API_BASE_URL` - Your backend URL (default: http://localhost:3000)

### Key Views

1. **SignInView** - Passkey and magic link authentication
2. **ConsentRequestView** - Full consent dialog with:
   - Requester information
   - What permissions are granted
   - Safety guarantees
   - Grant/Deny actions

3. **ActiveSessionView** - During active sessions showing:
   - Session status and duration
   - Time remaining with warnings
   - Helper information
   - **Prominent END SESSION button**
   - Safety reminders
   - Audit logging indicator

4. **MainView** - Home screen with pending requests

---

## 🔐 Security & Privacy

### Consent Model

1. **Request** - Helper requests access with optional message
2. **Review** - User sees full details of what's being shared
3. **Grant/Deny** - Explicit user action required
4. **Active** - Session active with continuous END button visibility
5. **Revoke** - Either party can end instantly

### Safety Features

- ⏱️ **Time Limits** - Sessions auto-expire (5-120 minutes configurable)
- 🛑 **Big END Button** - Always visible, no confirmation delay
- 🔒 **Client-Side Encryption** - Sensitive data encrypted before upload
- 📝 **Audit Logs** - All actions logged with timestamps
- 🔍 **Auto-Redaction** - Passwords, OTPs automatically hidden
- 👁️ **Session Recording Notice** - Clear indicator that session is logged

### Compliance

- **GDPR Ready** - Data export and deletion endpoints
- **Audit Trail** - Complete session history
- **User Control** - Consent can be revoked at any moment
- **Data Minimization** - Only necessary data collected

---

## 🚀 Getting Started

### Prerequisites

- **Web**: Node.js 18+, PostgreSQL 16
- **iOS**: Xcode 15+, iOS 16+ device/simulator
- **Optional**: Cloudflare R2, Stripe account, Clerk account

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd parent_assist_safeview
   ```

2. **Set up web application**
   ```bash
   cd safeview_web
   npm install
   cp .env.example .env
   # Configure your .env file
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

3. **Set up iOS application**
   ```bash
   cd ../safeview_ios
   # Open in Xcode and run
   ```

---

## 🎨 UI/UX Highlights

### Web
- Clean, accessible interface
- Large, clear consent dialogs
- Real-time session status
- Responsive design for all screen sizes

### iOS
- Native SwiftUI components
- Smooth animations
- System-native passkey integration
- Haptic feedback for critical actions

---

## 📋 Roadmap

- [ ] WebRTC screen sharing implementation
- [ ] Real-time signaling server
- [ ] iOS Broadcast Upload Extension
- [ ] AI-powered auto-redaction improvements
- [ ] Multi-language support
- [ ] Screen recording playback
- [ ] Advanced analytics dashboard
- [ ] Elder-care organization features
- [ ] Family plan subscriptions
- [ ] In-app chat/voice communication

---

## 🤝 Contributing

This is a safety-critical application. All contributions must:
- Maintain explicit consent requirements
- Never compromise the END button functionality
- Include comprehensive tests
- Follow security best practices
- Document privacy implications

---

## 📄 License

[Add your license here]

---

## 🆘 Support

For issues or questions:
- Open a GitHub issue
- Email: [your-support-email]

---

## ⚠️ Important Notes

### For Helpers
- **Always** respect the user's privacy
- **Never** pressure users to grant access
- **Immediately** end sessions when requested
- **Remember** all actions are logged

### For Users Being Helped
- You can **END THE SESSION AT ANY TIME**
- **No one** can access your screen without explicit consent
- **All sessions** have automatic time limits
- **Everything** is logged for your protection

---

**Built with privacy, safety, and consent as core values.**
