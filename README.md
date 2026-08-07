# SocialLink — Premier Social Discovery Platform

<div align="center">

**Nigeria's Safest Social Discovery & Specialized Consultation Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10-orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)

[Live Demo](https://sociallink.ng) • [Documentation](#documentation) • [Report Bug](#-support) • [Request Feature](#-support)

</div>

## 📖 Table of Contents

- [🌟 About](#-about)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [📱 Platform Features](#-platform-features)
- [🔒 Security](#-security)
- [📊 Database Schema](#-database-schema)
- [🎨 UI/UX Design](#-uiux-design)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 About

SocialLink is a cutting-edge social discovery platform that connects verified consultants with members seeking personalized social experiences. Built with safety and trust as our core principles, we provide a secure environment for social companionship, event attendance, travel partnerships, and lifestyle coaching.

### Our Mission

To create Nigeria's safest social discovery platform where genuine connections can flourish through verified identities, secure payments, and transparent interactions.

### Key Differentiators

- **NIN-Verified Consultants**: All consultants undergo rigorous identity verification
- **Escrow Protection**: Funds are securely held until session completion
- **Real-Time Communication**: Secure in-app messaging for active sessions
- **Reputation System**: Transparent ratings and reviews build trust
- **Geographic Discovery**: Find consultants near you with smart location matching

## ✨ Features

### 🔐 Authentication & Verification
- Firebase Phone Auth (OTP-based)
- NIN (National ID) verification with liveness checks
- Multi-step onboarding with role selection
- Demographics collection for better matching

### 👥 User Roles
- **Members**: Discover and book verified consultants
- **Consultants**: Offer specialized services and manage bookings
- **Admin**: Dispute resolution and platform oversight

### 💳 Secure Payments
- Paystack integration for wallet funding
- 15% platform commission (85% to consultants)
- Atomic escrow transactions with Firestore
- Automatic refunds for cancelled sessions

### 🗺️ Discovery & Matching
- Location-based consultant discovery
- Theme-based filtering (Social Companion, Event Attendance, etc.)
- Real-time availability status
- Advanced search and filtering

### 💬 Communication
- Secure in-app messaging for active sessions
- Real-time notifications via Firebase Cloud Messaging
- Image and file sharing capabilities
- Chat automatically closes after session completion

### 📊 Booking Management
- Real-time booking status updates
- 15-minute auto-accept timeout
- Session completion workflow
- Dispute resolution system

### 🎯 Reputation System
- 5-star rating system with reviews
- Automatic rating aggregation
- Public reputation profiles
- Review prompts after settled sessions

## 🏗️ Architecture

### Technology Stack

**Frontend**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Theme**: next-themes (Dark/Light mode)

**Backend**
- **Runtime**: Next.js Server Actions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage
- **Payments**: Paystack API
- **Real-time**: Firebase Realtime Database

**Infrastructure**
- **Hosting**: Vercel (Recommended)
- **CDN**: Vercel Edge Network
- **DNS**: Cloudflare (Optional)
- **Monitoring**: Firebase Performance Monitoring

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── admin/            # Admin panel
│   └── api/              # API routes (webhooks only)
├── components/           # Reusable React components
│   ├── auth/            # Authentication components
│   ├── booking/         # Booking management
│   ├── explore/         # Discovery interface
│   ├── maps/            # Location services
│   ├── messaging/       # Chat system
│   ├── support/         # AI support
│   └── ui/              # Shadcn UI components
├── actions/             # Server Actions
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── store/               # Zustand state management
└── types/               # TypeScript definitions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Paystack account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/sociallink.git
cd sociallink
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment setup**
```bash
cp .env.example .env.local
```

4. **Configure environment variables** (see [Configuration](#️-configuration))

5. **Initialize Firebase**
```bash
# Deploy Firebase functions and rules
firebase deploy --only functions,firestore,storage
```

6. **Run development server**
```bash
npm run dev
# or
yarn dev
```

7. **Open your browser**
```
http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_SECRET_KEY=sk_test_your_secret_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional Features
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
```

### Firebase Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Authentication, Firestore, Storage, and Functions

2. **Authentication Setup**
   - Enable Phone Auth
   - Configure reCAPTCHA (if needed)

3. **Firestore Rules**
   - Deploy the provided `firestore.rules` file
   - Configure security rules for your collections

4. **Storage Rules**
   - Deploy the provided `storage.rules` file
   - Configure public/private access patterns

5. **Service Account**
   - Generate private key for Admin SDK
   - Add to environment variables

### Paystack Configuration

1. **Create Paystack Account**
   - Sign up at [Paystack](https://paystack.co)
   - Get test keys for development

2. **Webhook Setup**
   - Configure webhook URL: `https://yourdomain.com/api/webhooks/paystack`
   - Enable payment events

## 📱 Platform Features

### User Journey Flow

#### Member Experience
1. **Registration**: Phone OTP verification → KYC completion
2. **Discovery**: Browse consultants by location, themes, availability
3. **Booking**: Select services → Funds locked in escrow
4. **Session**: In-app communication → Service delivery
5. **Completion**: Confirm satisfaction → Release funds → Leave review

#### Consultant Experience
1. **Application**: Phone OTP → NIN verification → Profile setup
2. **Service Setup**: Create service packages → Set pricing
3. **Booking Management**: Accept requests → Mark completion
4. **Payment**: Receive 85% payout after session completion
5. **Reputation**: Build profile through reviews and ratings

### Core Workflows

#### Escrow System
```mermaid
sequenceDiagram
    participant M as Member
    participant S as SocialLink
    participant C as Consultant
    
    M->>S: Request Booking (₦50,000)
    S->>S: Lock Funds in Escrow
    S->>C: Send Notification
    C->>S: Accept Booking
    M->>C: Attend Session
    C->>S: Mark Complete
    M->>S: Confirm & Release Funds
    S->>C: Pay ₦42,500 (85%)
    S->>S: Keep ₦7,500 (15% commission)
```

#### Verification Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Firebase Auth
    participant K as KYC Service
    participant D as Database
    
    U->>F: Phone Number + OTP
    F->>U: Authentication Token
    U->>K: Submit NIN + Selfie
    K->>K: Liveness Check + Verification
    K->>D: Update Verification Status
    D->>U: Grant Platform Access
```

## 🔒 Security

### Multi-Layer Security Architecture

1. **Authentication Layer**
   - Firebase Phone Auth with OTP
   - Session-based authentication tokens
   - Automatic token refresh

2. **Verification Layer**
   - NIN (National ID) verification
   - Liveness detection for photo verification
   - Manual review for edge cases

3. **Financial Security**
   - Atomic transactions with Firestore
   - Escrow system prevents fraud
   - Paystack webhook signature verification

4. **Data Protection**
   - Firestore security rules
   - Private file storage for verification docs
   - GDPR-compliant data handling

5. **Communication Security**
   - In-app messaging only (no external contact sharing)
   - Chat access limited to booking participants
   - Automatic chat closure after session completion

### Security Rules

#### Firestore Access Control
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own documents
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Bookings accessible to participants only
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        (resource.data.memberId == request.auth.uid || 
         resource.data.consultantId == request.auth.uid);
    }
  }
}
```

#### Storage Security
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public avatars and gallery images
    match /avatars/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Private verification documents
    match /verification/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 📊 Database Schema

### Core Collections

#### Users Collection
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  role: "MEMBER" | "CONSULTANT";   // User role
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Wallet information
  wallet: {
    availableBalance: number;      // Available for booking
    escrowBalance: number;         // Locked in active sessions
  };
  
  // Profile information (stored in separate collection)
}
```

#### Profiles Collection
```typescript
interface Profile {
  uid: string;                    // Matches users.uid
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  blurAvatar: boolean;            // Privacy setting
  
  // Demographics
  gender?: string;
  sexualOrientation?: string;
  bodyBuild?: string;
  smoking: boolean;
  
  // Location
  location?: {
    latitude: number;
    longitude: number;
  };
  locationLabel?: string;
  
  // Services
  services?: Service[];
  retainer?: number;              // Deprecated, use services
  
  // Themes/Interests
  themes: string[];
  
  // Availability
  isOnline: boolean;
  
  // Reputation
  averageRating: number;
  totalReviews: number;
}
```

#### Bookings Collection
```typescript
interface Booking {
  bookingId: string;              // Auto-generated ID
  memberId: string;               // References users.uid
  consultantId: string;           // References users.uid
  
  // Services
  selectedServices: Service[];    // Booked services
  amountLocked: number;           // Total in escrow
  
  // Status tracking
  status: "REQUESTED" | "ACCEPTED" | "ACTIVE" | "COMPLETED" | "SETTLED" | "CANCELLED" | "DISPUTED" | "REFUNDED";
  
  // Timestamps
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
  settledAt?: Timestamp;
  
  // Communication
  chatId?: string;                // References chats collection
  
  // Financial
  receipt?: {
    totalAmount: number;
    platformFee: number;          // 15%
    consultantPayout: number;     // 85%
  };
}
```

#### Services Schema
```typescript
interface Service {
  id: string;                     // UUID
  title: string;
  description: string;
  price: number;                  // Price per session in NGN
  createdAt: Timestamp;
}
```

## 🎨 UI/UX Design

### Design System

#### Typography
- **Display**: Space Grotesk (headings, branding)
- **Body**: Plus Jakarta Sans (content, UI elements)
- **Monospace**: JetBrains Mono (code, data display)

#### Color Palette
```css
/* Primary Brand */
--primary: oklch(0.65 0.18 340);     /* Purple */
--primary-foreground: oklch(0.15 0.02 340);

/* Semantic Colors */
--destructive: oklch(0.55 0.22 10);   /* Red */
--muted: oklch(0.22 0.04 340);       /* Gray */
--accent: oklch(0.30 0.05 340);      /* Light purple */
```

#### Component Library
- **Shadcn UI**: Base component system
- **Custom Components**: Booking cards, consultant profiles, maps
- **Animations**: Framer Motion for micro-interactions
- **Icons**: Lucide React icon set

### Responsive Design
- **Mobile-first approach**
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly interactions**
- **Progressive enhancement**

### Accessibility
- **WCAG 2.1 AA compliance**
- **Semantic HTML structure**
- **ARIA labels and descriptions**
- **Keyboard navigation support**
- **Screen reader compatibility**

## 🚀 Deployment

### Production Deployment

#### 1. Environment Setup
```bash
# Production environment variables
NEXT_PUBLIC_APP_URL=https://sociallink.ng
NODE_ENV=production
```

#### 2. Build Process
```bash
# Build for production
npm run build

# Start production server
npm start
```

#### 3. Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

#### 4. Firebase Deployment
```bash
# Deploy Firebase functions and rules
firebase deploy --only functions,firestore,storage,hosting
```

### Environment Checklist

#### Development
- [ ] Firebase project created
- [ ] Environment variables configured
- [ ] Firestore security rules deployed
- [ ] Storage rules deployed
- [ ] Paystack test keys configured

#### Production
- [ ] Custom domain configured
- [ ] SSL certificate installed
- [ ] Production Firebase project
- [ ] Paystack live keys configured
- [ ] Monitoring and analytics set up
- [ ] Error tracking configured
- [ ] Backup strategy implemented

### Performance Optimization

#### Next.js Optimizations
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Static Generation**: Landing pages and marketing content
- **ISR**: Semi-static content with revalidation

#### Firebase Optimizations
- **Indexing**: Composite indexes for common queries
- **Batch Operations**: Reduce read/write operations
- **Caching**: Client-side query caching
- **Pagination**: Limit result sets for large collections

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for detailed instructions.

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following our coding standards
4. **Add tests** for new functionality
5. **Run tests**: `npm run test`
6. **Commit changes**: `git commit -m 'feat: add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow recommended rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality
- **Semantic Commits**: Follow conventional commit format

### Reporting Issues

When reporting bugs or requesting features, please:

1. **Search existing issues** to avoid duplicates
2. **Use descriptive titles** and clear descriptions
3. **Include reproduction steps** for bugs
4. **Provide environment details** (OS, browser, version)
5. **Add relevant screenshots** or error messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 SocialLink Technologies Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- **Firebase Team** for the excellent backend services
- **Vercel Team** for the amazing hosting platform
- **Paystack** for seamless payment processing
- **Shadcn UI** for the beautiful component library
- **Framer Motion** for smooth animations
- **Our Community** for feedback and support

---

## 🏆 BuildX AI Season Hackathon on X Layer

This branch (`feat/web3-xlayer-hackathon`) extends SocialLink with Web3 + AI on X Layer.

**Features added:**
- AI Booking Assistant (Vercel AI SDK + Anthropic Claude)
- AI Dispute Mediator with EIP-712 signing
- Solidity escrow contract on X Layer testnet
- OKX Wallet authentication (SIWE, EIP-4361)
- USDC funding + tx history
- Cloud Function EVM event listener

**Submission package:** see [`SUBMISSION.md`](./SUBMISSION.md)
**Deployment guide:** see [`DEPLOYMENT.md`](./DEPLOYMENT.md)

**Stack additions:**
- wagmi v2, viem v2, RainbowKit
- Foundry (Solidity 0.8.24, OpenZeppelin v5)
- Vercel AI SDK v6, @ai-sdk/anthropic
- siwe v3 (EIP-4361)

**Made for @XLayerOfficial · #BuildXAI**

---

<div align="center">

**Built with ❤️ in Nigeria, for Nigeria**

[Website](https://sociallink.ng) • [Support](mailto:support@sociallink.ng) • [Twitter](https://twitter.com/SocialLinkNG)

</div>
