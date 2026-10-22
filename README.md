# Minerva: AI-Powered Personalised Learning Through Learning-Gap Detection

> **Hackathon Prototype** • Focus: Root conceptual misconception diagnosis rather than just flagging wrong answers.

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration** (Optional - defaults to reliable offline demo fallback):
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   To use live **xAI Grok API**, set:
   ```env
   XAI_API_KEY=your_xai_key_here
   GROK_MODEL=grok-2-latest
   DEMO_MODE=false
   ```
   *(If `DEMO_MODE=true` or no key is provided, the resilient scripted demo engine handles all happy paths flawlessly with zero latency)*.

3. **Initialize / Reset Database**:
   ```bash
   npm run seed
   ```
   *(Pre-seeds 15 realistic students + 1 live demo student into `data/db.json`)*.

4. **Run local development server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** (or navigate between `/student` and `/teacher`).

---

## 👥 Conflict-Free Architecture

Both domains are fully integrated and modularized:

* **Student Domain**:
  - `app/student/page.tsx` (Student Hub with tabs for Socratic Chat and Knowledge Map)
  - `components/tutor/*` (Socratic Chat, ProblemCard, DiagnosisPanel, Shortcut modal)
  - `components/student/*` (KnowledgeMap, MisconceptionList, RevisitQueue)
  - `app/api/tutor/route.ts` & `app/api/student/route.ts`
  - `lib/grok.ts` (xAI Grok client with JSON output validation & fallback)

* **Teacher Domain**:
  - `app/teacher/page.tsx` (Teacher Command Center)
  - `components/teacher/*` (Charts, Heatmap, Student Roster, At-Risk Alerts, Action Plan)
  - `app/api/teacher/route.ts`

* **Shared Foundation**:
  - `types/database.ts` (Unified TypeScript types for Student, MisconceptionLog, RevisitQueue, and TutorResponse)
  - `data/db.json` (Local persistent JSON store)
  - `lib/db.ts` (Safe reader & writer helpers)
  - `components/Navbar.tsx` (Global top navigation with instant demo reset and +3 Days simulation)

---

## 🎯 3-Minute Hackathon Demo Script (Full Pitch)

### Act 1: The Student Experience (`/student`) — 1m 30s
1. **The Core Premise**:
   - Open `/student`. Explain: *"Most educational AIs act like calculators—giving away the step-by-step answer immediately. Minerva is fundamentally different: it's a Socratic tutor that diagnoses root conceptual misconceptions."*
2. **The Socratic Interaction**:
   - Show problem card: `1/2 + 1/3 = ?`.
   - Click **`1. Answer "2/5"`**: Point out the live **Tutor's Diagnosis Panel** illuminating with **[M1: Suspected]** (85% confidence). Notice the tutor does **not** give the answer—it asks *"Why did you choose 2/5?"*.
   - Click **`2. "I added tops and bottoms"`**: The diagnosis confirms to **[M1: Gap Confirmed]** (95% confidence). The tutor presents a **Cognitive Conflict Question**: *"Is 2/5 smaller than 1/2? If you add a positive fraction, can you have less than half?"*.
   - Click **`3. "Wait, 2/5 is smaller!"`**: The student realizes the absurdity. The tutor prompts for common denominators.
   - Click **`4. "Convert to sixths: 5/6"`**: The tutor celebrates! The diagnosis turns green **[Resolved]**.
3. **Easiest Method Unlock**:
   - Click the bouncing **"Show Easiest Method"** button: explain that shortcut tricks (like the Butterfly cross-multiplication method) are **only unlocked after conceptual understanding is proven**.
4. **Knowledge Map & Forgetting-Aware Revisits**:
   - Switch to the **Knowledge Map & Revisits** tab: show the color-coded prerequisite graph and Before/After score card.
   - Click **"Simulate +3 Days"**: watch a scheduled checkup trigger with **"⚠️ Retest Due Now"**. Take the retest to confirm retention!

### Act 2: The Teacher Command Center (`/teacher`) — 1m 30s
1. **Class-Wide Learning Gap Aggregation**:
   - Switch to `/teacher`. Point out the headline **Ranked Misconceptions Bar Chart**: 14 of 16 students (88%) suffer from **M1 (Adding tops and bottoms)**.
2. **Prerequisite Heatmap**:
   - Show that students struggling with *Adding Fractions* are actually bottlenecked at *Common Denominators (46% mastery)*.
3. **Live Sync & Student Detail**:
   - Click on **Alex Chen (Demo Student)**: show how their live Socratic session just updated the teacher's record in real time with exact quote evidence and mastery metrics.
4. **Action Recommendations**:
   - Highlight the AI-generated pedagogical action: *"Schedule a small-group intervention on common denominators for 12 students."*
