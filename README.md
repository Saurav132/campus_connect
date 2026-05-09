# Campus Connect AI 🚀

Campus Connect AI is a premium, AI-powered networking and mentorship platform designed specifically for students, alumni, and mentors. It bridges the gap between academic learning and professional success by leveraging Google's Gemini AI to provide intelligent career guidance and foster collaborative communities.

![Campus Connect AI Banner](https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop)

## ✨ Features

- **🤖 AI Resume Analysis (ATS)**: Upload your resume for instant AI-powered feedback. Get scores on professional impact, skill density, and formatting, with specific tips to beat Applicant Tracking Systems.
- **📅 Events Portal**: Discover and host campus events, workshops, and hackathons. Includes team size management and required skill tagging for collaborative mixers.
- **🤝 Team Collaboration & Projects**: Build or join project teams. Manage membership requests, collaborative chats, and showcase your experimental work.
- **🎓 Mentorship Hub**: Connect with industry mentors and alumni. AI-assisted matching helps students find the right guidance for their career goals.
- **🌐 Professional Networking**: Build a digital presence with rich profiles, activity feeds, and a secure networking system to stay connected with peers.
- **💼 Opportunities Board**: Access exclusive internships, job listings, and research opportunities curated for the campus community.
- **🛡️ Admin Verification**: Rigorous verification system for events and opportunities to ensure a safe, high-quality environment.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **AI Core**: [Google Gemini AI](https://ai.google.dev/) (`@google/genai`)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud/Firebase Project
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository** (or download the source):
   ```bash
   git clone https://github.com/yourusername/campus-connect-ai.git
   cd campus-connect-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root and add your configuration:
   ```env
   # Firebase Config (Get from Firebase Console)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # AI Integration
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## 📐 Project Structure

```text
/src
  /pages         # Feature-based view components
    /ats         # AI Resume Checker
    /events      # Event management
    /mentorship  # Mentor connection logic
    /projects    # Team Building & Project management
  /components    # Global UI components (Shadcn-like)
  /services      # API integrations (Firebase, AI)
  /context       # React Context (Auth, Theme)
  /types         # TypeScript definitions
  /lib           # Shared utilities
```

## 🔒 Security & Performance

- **Firestore Rules**: Granular security rules ensure users can only access their own data and verified public content.
- **AI Rate Limiting**: Intelligent caching and error handling for Gemini API calls.
- **Responsive Design**: Mobile-first architecture using Tailwind CSS, optimized for tablets and laptops.
- **Edge UI**: Fast, snappy transitions using Motion and skeleton loaders for a premium feel.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the student community.
