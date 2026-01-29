# TrustMeBro-Web

A modern, responsive e-commerce platform built with Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. This project consists of two separate web applications: a **Buyer (Customer) App** and a **Seller (Shop Owner) App**.

## 🏗️ Architecture

The project uses Next.js App Router with route groups to separate the two applications:

- **Buyer App**: `app/(buyer)/` - Customer-facing e-commerce experience
- **Seller App**: `app/(seller)/` - Shop management dashboard

Both apps share:
- Design tokens (colors, typography, spacing)
- Reusable UI components from shadcn/ui
- TypeScript interfaces
- Tailwind CSS configuration

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Font**: Inter (Google Fonts)

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Buyer App

### Pages & Features

- **Landing Page** (`/buyer`) - Hero section, categories, featured products
- **Authentication**:
  - Login (`/buyer/login`)
  - Register (`/buyer/register`)
  - OTP Verification (`/buyer/otp-verification`)
  - Forgot Password (`/buyer/forgot-password`)
- **Products**:
  - Product Listing (`/buyer/products`) - With filters and search
  - Product Detail (`/buyer/products/[id]`) - Full product view
- **Shopping**:
  - Cart (`/buyer/cart`) - Shopping cart management
  - Checkout (`/buyer/checkout`) - Multi-step checkout flow
- **Orders**:
  - Orders List (`/buyer/orders`) - Order history
  - Order Detail (`/buyer/orders/[id]`) - Order tracking with timeline
- **Account**:
  - Profile (`/buyer/profile`) - User profile management
  - Addresses (`/buyer/addresses`) - Address CRUD
- **Notifications** (`/buyer/notifications`) - Notification center
- **Chat** (`/buyer/chat`) - Customer-seller messaging

### Design Features

- Top navigation bar (desktop)
- Bottom navigation bar (mobile)
- Conversion-focused UX
- Mobile-first responsive design
- Color scheme: Coral Red (#FF6B6B), Turquoise (#4ECDC4), Sunny Yellow (#FFE66D)

## 🏪 Seller App

### Pages & Features

- **Authentication**:
  - Login (`/seller/auth/login`) - Email/password or OTP
  - OTP Login (`/seller/auth/otp-login`) - Phone-based authentication
- **Dashboard** (`/seller`) - Stats, charts, recent orders, top products
- **Products**:
  - Product List (`/seller/products`) - Manage product catalog
  - Create Product (`/seller/products/create`) - Add/edit products
- **Orders**:
  - Orders List (`/seller/orders`) - Manage orders with status filters
  - Order Detail (`/seller/orders/[id]`) - Order management with status updates
- **Shop Profile** (`/seller/shop`) - Shop branding and business information
- **Notifications** (`/seller/notifications`) - Shop activity notifications
- **Messages** (`/seller/messages`) - Customer communication

### Design Features

- Sidebar navigation (desktop)
- Drawer navigation (mobile)
- Data-driven dashboard
- Tables that convert to cards on mobile
- Color scheme: Slate grays with accent blues, greens, oranges

## 🎨 Design System

### Shared Design Tokens

Both apps share design tokens defined in `tailwind.config.ts`:

- **Buyer Colors**: `buyer-primary`, `buyer-secondary`, `buyer-accent`
- **Seller Colors**: `seller-primary`, `seller-accent-blue`, `seller-accent-green`, etc.
- **Semantic Colors**: `success`, `warning`, `error`, `info`
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Border Radius**: Unified radius system

### Component Library

Reusable components in `components/ui/`:
- Button (with buyer/seller variants)
- Card
- Input
- Label
- Badge
- Radio Group
- Textarea

## 📱 Responsive Design

Both apps are fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations

**Buyer App**:
- Bottom navigation bar
- Collapsible top menu
- Stacked layouts
- Touch-friendly buttons

**Seller App**:
- Drawer sidebar
- Tables → Cards
- Stacked dashboard widgets
- Mobile-optimized forms

## 🗂️ Project Structure

```
├── app/
│   ├── (buyer)/          # Buyer app routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── products/
│   │   ├── cart/
│   │   └── ...
│   ├── (seller)/          # Seller app routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   ├── products/
│   │   ├── orders/
│   │   └── ...
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/portal selection
│   └── globals.css
├── components/
│   ├── buyer/             # Buyer-specific components
│   │   ├── header.tsx
│   │   └── bottom-nav.tsx
│   ├── seller/            # Seller-specific components
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── ui/                # Shared UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── lib/
│   └── utils.ts           # Utility functions
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json
└── package.json
```

## 🛠️ Development

### Adding New Pages

1. Create a new route in `app/(buyer)/` or `app/(seller)/`
2. Use the shared UI components from `components/ui/`
3. Follow the design system guidelines
4. Ensure responsive design

### Adding New Components

1. Create component in `components/ui/` for shared components
2. Use shadcn/ui patterns for consistency
3. Export from component file
4. Import where needed

### Styling Guidelines

- Use Tailwind utility classes
- Follow the design token system
- Use buyer/seller color variants appropriately
- Maintain responsive breakpoints
- Follow accessibility best practices

## 🚀 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📝 TypeScript

The project is fully typed with TypeScript. All components and pages include proper type definitions.

## ♿ Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements
- Color contrast meets WCAG AA standards

## 🔒 Security Considerations

- Form validation ready
- CSRF token placeholders
- XSS protection ready
- Secure authentication flows

## 📄 License

Proprietary - TrustMeBro Platform

## 🤝 Contributing

When adding features:
1. Follow existing design patterns
2. Use shared components
3. Maintain responsive design
4. Update this README if needed

---

**Built with ❤️ for TrustMeBro Platform**
