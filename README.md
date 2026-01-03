# ResolGate - Secure File Management Platform

<div align="center">

![ResolGate Logo](https://img.shields.io/badge/ResolGate-Secure%20File%20Management-blue?style=for-the-badge)

**A modern, secure file management platform with AI-powered content moderation and admin approval workflows.**

[Features](#features) • [Getting Started](#getting-started) • [User Guide](#user-guide) • [Admin Guide](#admin-guide) • [AI Integration](#ai-integration) • [Tech Stack](#tech-stack)

</div>

---

## 📋 Overview

ResolGate is a comprehensive file management solution designed for organizations that require controlled file sharing with approval workflows. It combines an intuitive user interface with powerful administrative controls and AI-assisted content moderation.

### Key Highlights

- 🔐 **Guest-based Authentication** - Simple username-based access for users
- 📁 **Hierarchical File Organization** - Nested folders with drag-and-drop support
- ✅ **Admin Approval Workflow** - All uploads require admin review before publishing
- 🤖 **AI Content Moderation** - Automated safety scanning for uploaded content
- 🔗 **File Sharing** - Generate shareable links with expiry and download limits
- 📱 **Responsive Design** - Full mobile and desktop support

---

## ✨ Features

### For Users

| Feature | Description |
|---------|-------------|
| **File Upload** | Upload single files or entire folders while preserving directory structure |
| **Folder Management** | Create, rename, move, and delete folders |
| **File Preview** | Preview images, PDFs, videos, and audio files directly in-browser |
| **Favorites** | Star important files for quick access |
| **Recent Files** | Track recently accessed files |
| **File Sharing** | Generate public links with optional expiry dates and download limits |
| **Copy/Paste** | Clipboard-based file operations across folders |

### For Administrators

| Feature | Description |
|---------|-------------|
| **Approval Dashboard** | Review and approve/reject pending uploads and deletions |
| **Bulk Operations** | Approve or reject multiple items simultaneously |
| **AI Moderation** | Scan uploads for harmful or misleading content |
| **User Activity** | See who uploaded each file and when |
| **Real-time Updates** | Live notifications for new pending actions |

---

## 🚀 Getting Started

### Accessing the Platform

1. **Navigate to the Entry Page**
   - Visit the application URL
   - You'll be greeted with the ResolGate login screen

2. **Enter Your Username**
   - Type any username (minimum 2 characters)
   - Click "Enter" to access the platform
   - Your username is stored locally for future sessions

3. **Admin Access**
   - Click "Admin Login" at the bottom of the entry page
   - Enter the admin password to gain administrative privileges
   - Admin mode persists until you explicitly exit

---

## 📖 User Guide

### Navigation

The platform features a clean, intuitive navigation system:

```
┌─────────────────────────────────────────────────────────┐
│  🔷 ResolGate                              [User Menu] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  📁 All Files│         Main Content Area               │
│  🕐 Recent   │                                          │
│  ⭐ Favorites│    Files and folders displayed here     │
│  🛡️ Admin*  │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
* Admin Panel visible only when logged in as admin
```

#### Desktop Navigation
- **Sidebar** (left): Quick access to All Files, Recent, Favorites, and Admin Panel
- **Header** (top): Logo, admin badge (if applicable), and user dropdown menu
- **Breadcrumbs**: Navigate folder hierarchy with clickable path segments

#### Mobile Navigation
- **Hamburger Menu**: Tap the menu icon to reveal the navigation sidebar
- **Bottom Actions**: Quick access to upload functionality
- **Swipe Gestures**: Navigate between folders naturally

### File Operations

#### Uploading Files

1. **Single File Upload**
   - Click the "Upload File" button in the toolbar
   - Select a file from your device
   - The file enters the pending approval queue

2. **Bulk/Folder Upload**
   - Click "Upload Folder" to upload entire directory structures
   - The folder hierarchy is preserved
   - All files are queued for admin approval

3. **Drag and Drop**
   - Drag files directly onto the file grid
   - Multiple files can be dropped simultaneously

> ⚠️ **Note**: All uploads require admin approval before becoming visible to other users.

#### Managing Files and Folders

**Creating Folders**
```
Click "New Folder" → Enter name → Submit
```

**Renaming Items**
```
Right-click item → Select "Rename" → Enter new name → Confirm
```

**Moving Items**
```
Right-click item → Select "Move to..." → Choose destination folder → Confirm
```

**Copying Items**
```
Right-click item → Select "Copy" → Navigate to destination → Click "Paste"
```

**Deleting Items**
```
Right-click item → Select "Delete" → Confirm deletion
```
> Deletions also require admin approval before taking effect.

#### File Preview

Click on any file to open the preview dialog:

| File Type | Preview Capability |
|-----------|-------------------|
| **Images** | Full inline preview with zoom |
| **PDFs** | Embedded PDF viewer |
| **Videos** | Video player with controls |
| **Audio** | Audio player with playback controls |
| **Other** | Download option available |

#### File Sharing

1. Right-click a file and select "Share"
2. Configure sharing options:
   - **Expiry Date**: Set when the link becomes invalid
   - **Download Limit**: Maximum number of downloads allowed
3. Copy the generated shareable link
4. Recipients can access the file without logging in

---

## 🛡️ Admin Guide

### Accessing Admin Mode

1. From the Entry page, click "Admin Login"
2. Enter the admin password: `coderesol`
3. You'll see an "Admin" badge in the header

### Admin Dashboard

Navigate to the Admin Panel to manage pending actions:

```
┌─────────────────────────────────────────────────────────┐
│  Admin Approval Dashboard                               │
├─────────────────────────────────────────────────────────┤
│  [Bulk Actions: ☑️ Select All | ✅ Approve | ❌ Reject] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📄 document.pdf          [Preview] [AI Scan] [Actions]│
│     Uploaded by: John     │ Safe ✓                     │
│     Status: Pending       │                            │
│                                                         │
│  🖼️ image.png            [Preview] [AI Scan] [Actions]│
│     Uploaded by: Jane     │ Not Scanned                │
│     Status: Pending       │                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Approval Workflow

1. **Review Pending Items**
   - View file previews directly in the dashboard
   - See uploader information and submission time

2. **AI Content Moderation** (Optional)
   - Click "Scan" to analyze content for safety
   - Review the safety level badge:
     - 🟢 **Safe**: Content appears appropriate
     - 🟡 **Low Risk**: Minor concerns detected
     - 🟠 **Medium Risk**: Review carefully
     - 🔴 **High Risk**: Potentially harmful content

3. **Take Action**
   - **Approve**: File becomes visible to all users
   - **Reject**: File is removed from the queue

4. **Bulk Operations**
   - Select multiple items using checkboxes
   - Use bulk approve/reject for efficiency

### Exiting Admin Mode

- Click your avatar → "Exit Admin Mode"
- You retain regular user access
- Re-enter admin mode anytime via Admin Login

---

## 🤖 AI Integration

ResolGate integrates AI-powered content moderation to help administrators make informed decisions about uploaded content.

### How AI Moderation Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Upload     │────▶│  AI Scans    │────▶│   Safety     │
│   Pending    │     │  Content     │     │   Rating     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Categories  │
                    │  Analyzed:   │
                    │  - Violence  │
                    │  - Adult     │
                    │  - Harmful   │
                    │  - Deceptive │
                    └──────────────┘
```

### AI Features

1. **Content Safety Analysis**
   - Scans images and documents for potentially harmful content
   - Provides confidence scores for different safety categories
   - Helps prioritize review of flagged content

2. **Safety Levels**
   | Level | Meaning | Recommended Action |
   |-------|---------|-------------------|
   | Safe | No concerning content detected | Approve if appropriate |
   | Low | Minor potential issues | Review briefly |
   | Medium | Moderate concerns | Review carefully |
   | High | Significant safety concerns | Review thoroughly before approving |

3. **Edge Function Architecture**
   - AI processing runs on serverless edge functions
   - Powered by Lovable AI (Gemini models)
   - No external API keys required

### Using AI Moderation

1. In the Admin Dashboard, locate a pending item
2. Click the "Scan" or "AI Check" button
3. Wait for the analysis to complete (typically 2-5 seconds)
4. Review the safety badge and detailed results
5. Make an informed approval/rejection decision

> 💡 **Tip**: AI moderation is a tool to assist decision-making, not replace human judgment. Always review flagged content manually.

---

## 🏗️ Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   React     │  │  Tailwind   │  │   shadcn    │            │
│  │   Router    │  │    CSS      │  │     UI      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lovable Cloud Backend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Database   │  │   Storage   │  │    Edge     │            │
│  │ (PostgreSQL)│  │  (Files)    │  │  Functions  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Core Tables

| Table | Purpose |
|-------|---------|
| `guest_users` | Store user identities |
| `files` | File metadata and references |
| `folders` | Folder hierarchy and structure |
| `pending_actions` | Approval queue for uploads/deletions |
| `favorites` | User-favorited files |
| `file_share_links` | Shareable link configurations |
| `file_access_logs` | Access tracking and analytics |

#### Approval Workflow States

```
Upload → pending_actions (status: 'pending')
                │
        ┌───────┴───────┐
        ▼               ▼
    Approved         Rejected
        │               │
        ▼               ▼
  files table      Deleted from
   (published)     temp storage
```

### Security Model

- **Row Level Security (RLS)**: All tables protected with granular access policies
- **Guest Authentication**: Username-based identity without passwords
- **Admin Authorization**: Password-protected admin capabilities
- **Storage Security**: Files stored with proper access controls
- **Signed URLs**: Time-limited access to private files

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library |
| **Lucide React** | Icon library |
| **React Hook Form** | Form handling |
| **Zod** | Schema validation |

### Backend (Lovable Cloud)

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Relational database |
| **Storage** | File storage with CDN |
| **Edge Functions** | Serverless compute |
| **Realtime** | Live data subscriptions |
| **Lovable AI** | AI model access (Gemini) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Layout.tsx          # Main layout with navigation
│   ├── FileUpload.tsx      # File upload functionality
│   ├── BulkFileUpload.tsx  # Folder/bulk upload
│   ├── FolderGrid.tsx      # File/folder grid display
│   ├── FilePreviewDialog.tsx # File preview modal
│   ├── FileShareDialog.tsx # Share link generation
│   ├── RenameDialog.tsx    # Rename functionality
│   ├── FolderTreePicker.tsx # Move destination selector
│   └── ...
├── contexts/
│   └── GuestAuthContext.tsx # Authentication state
├── hooks/
│   ├── useAuth.tsx         # Auth utilities
│   ├── useClipboard.tsx    # Copy/paste operations
│   └── useGuestAuth.tsx    # Guest auth hook
├── pages/
│   ├── Index.tsx           # Main file browser
│   ├── Entry.tsx           # Login page
│   ├── Admin.tsx           # Admin dashboard
│   ├── AdminLogin.tsx      # Admin authentication
│   ├── Favorites.tsx       # Favorited files
│   ├── Recent.tsx          # Recently accessed
│   └── SharePage.tsx       # Public share view
├── integrations/
│   └── supabase/
│       ├── client.ts       # Database client
│       └── types.ts        # TypeScript types
└── lib/
    └── utils.ts            # Utility functions

supabase/
├── functions/
│   └── moderate-content/   # AI moderation edge function
└── config.toml             # Backend configuration
```

---

## 🔧 Configuration

### Environment Variables

The following variables are automatically configured:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Admin Password

The default admin password is `coderesol`. This can be modified in:
```
src/contexts/GuestAuthContext.tsx
```

---

## 📱 Responsive Design

ResolGate is fully responsive across all device sizes:

| Breakpoint | Layout |
|------------|--------|
| **Mobile** (<768px) | Hamburger menu, stacked layout, touch-optimized |
| **Tablet** (768-1024px) | Collapsible sidebar, adaptive grid |
| **Desktop** (>1024px) | Full sidebar, multi-column grid |

---

## 🔒 Security Considerations

1. **No Sensitive Data in Client**: Admin passwords should be moved to environment variables in production
2. **RLS Policies**: All database tables have Row Level Security enabled
3. **Signed URLs**: Private files are accessed via time-limited signed URLs
4. **Input Validation**: All user inputs are validated before processing
5. **AI Moderation**: Optional but recommended for public-facing deployments

---

## 🚀 Deployment

### Using Lovable

Simply open [Lovable](https://lovable.dev/projects/bb0e36c1-8512-42e7-8087-b3df42e139f8) and click on Share → Publish.

### Custom Domain

To connect a custom domain:
1. Navigate to Project → Settings → Domains
2. Click "Connect Domain"
3. Follow the DNS configuration instructions

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 📞 Support

For issues or feature requests:
1. Check the documentation above
2. Review the codebase for implementation details
3. Contact your system administrator

---

<div align="center">

**Built with ❤️ using Lovable**

[Lovable.dev](https://lovable.dev)

</div>
