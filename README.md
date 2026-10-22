# Minerva: AI-Powered Personalised Learning Through Learning-Gap Detection

> **Hackathon Prototype** • Focus: Root conceptual misconception diagnosis rather than just flagging wrong answers.

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Initialize / Reset Database**:
   ```bash
   npm run seed
   ```
   *(Pre-seeds 15 realistic students + 1 live demo student into `data/db.json`)*

3. **Run local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (redirects to `/teacher`).

---

## 👥 Conflict-Free Collaboration Setup

To keep work between **Teacher Dashboard** and **Student Dashboard** completely conflict-free:

* **Teacher Domain (This Branch: `feat/teacher-dashboard`)**:
  - `app/teacher/page.tsx`
  - `components/teacher/*` (Charts, Heatmap, Student Roster, At-Risk Alerts, Action Plan)
  - `app/api/teacher/route.ts`

* **Student Domain (Teammate)**:
  - `app/student/page.tsx`
  - `components/student/*` (Socratic Chat, Live Diagnosis HUD, Notes, Voice)
  - `app/api/tutor/route.ts`

* **Shared Contract & Single Source of Truth**:
  - `types/database.ts` (Typed interfaces for Student, MisconceptionLog, RevisitQueue)
  - `data/db.json` (Flat-file database read and written atomically)
  - `lib/db.ts` (Safe reader & writer helpers)

---

## 🎯 3-Minute Hackathon Demo Script (Teacher View)

1. **The Core Premise**:
   - Introduce Minerva: Standard AI homework helpers only solve problems; Minerva diagnoses the **root cognitive flaw** behind the mistake.
2. **Headline Panel (Ranked Misconceptions Chart)**:
   - Point out **M1 (88% of class)**: Students add numerators and denominators straight across (`1/2 + 1/3 = 2/5`).
   - Click the bar to reveal the recommended Socratic cognitive conflict question (*"Is 2/5 bigger than 1/2?"*).
3. **Prerequisite Heatmap**:
   - Show how students struggling with **Adding Fractions** are actually blocked at **Common Denominators (46% mastery)**.
4. **Diagnostic Evidence in Student Roster**:
   - Click on **Alex Chen (Live Demo Student)** or any student row to open the Diagnostic Modal.
   - Show the exact quote extracted from student chat, confidence %, and spaced retention schedule.
5. **Fast-Forward Retention**:
   - Click the **"Simulate +3 Days"** button in the top navbar to showcase how Minerva spaces out retests (Day 1, 3, 7) to ensure long-term mastery.
