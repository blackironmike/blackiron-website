# New Lead Nurture Campaign — GHL Workflow Setup

## Overview
5-email nurture sequence over 7 days for new website leads, flowing into the existing Consultations pipeline. If a lead books a consultation at any point during the sequence, they exit the nurture and move forward in the pipeline.

---

## Reference IDs

| Resource | ID |
|---|---|
| **Location** | `snIUpSaFzz5WsavMB3QA` |
| **Consultations Pipeline** | `3k9WenxdDAulbEraTlS4` |
| **Pipeline Stage: New Lead** | `1cdfc65d-7002-4564-8191-f09b51576138` |
| **Pipeline Stage: Contacted** | `03706c1a-249d-4947-99dc-c084e14ce698` |
| **Pipeline Stage: Consultation Booked** | `53b12bc0-0545-4de0-96d7-e86df5e96478` |
| **Pipeline Stage: Showed** | `f55b8e7b-0b56-4e27-98a2-5129324c851e` |
| **Pipeline Stage: No Show** | `203ff43f-2ac6-40ef-b30e-bce5d38af988` |
| **Pipeline Stage: Closed** | `0c44de67-9e1b-47cd-83de-096259cec2a6` |
| **Consultations Calendar** | `aOyy4UPbwziVvHz35TCU` |
| **Calendar Widget Slug** | `consultations-21` |
| **Booking Link** | `https://api.leadconnectorhq.com/widget/booking/aOyy4UPbwziVvHz35TCU` |
| **Form ID (trigger)** | `vw0hMdDkTCL6K5N3i7vF` |
| **Tag: new lead** | `XqV5AkbUHjeaMTQk6qnM` |
| **Tag: nurture - active** | `q7bGXEOgIFntwpL92QCe` |
| **Tag: nurture - completed** | `Hy9CviBjLyfE5Ubi0zK7` |
| **Tag: consultation booked** | `fIUBh4YiPGpyvttumpPw` |
| **Tag: consultation completed** | `Bwi6ffRhQZdbe7Q4sbs2` |
| **Tag: won - member** | `8hfL7sypSmGO4pxqDVFb` |
| **Tag: lost - not interested** | `GdcIhsuub9wooMHADqkN` |

---

## Email Sequence Summary

| # | Day | Subject | File |
|---|-----|---------|------|
| 1 | 0 | Welcome to Black Iron Athletics | `email-1-welcome.html` |
| 2 | 1 | Here's What Our Members Say | `email-2-social-proof.html` |
| 3 | 2 | Your First Step to Getting Stronger | `email-3-philosophy.html` |
| 4 | 4 | Not Sure If This Is For You? | `email-4-objections.html` |
| 5 | 7 | Your Free Consultation Is Waiting | `email-5-final-push.html` |

---

## Workflow Setup (Step-by-Step in GHL)

### Step 1: Create the Workflow

1. Go to **Automation > Workflows**
2. Click **"+ Create Workflow"** > **"Start from Scratch"**
3. Name it: **"New Lead — Nurture to Consultation"**

### Step 2: Set the Trigger

1. Click **"Add New Trigger"**
2. Select **"Form Submitted"**
3. Filter > Form: select the popup form (`vw0hMdDkTCL6K5N3i7vF`)
4. Save trigger

### Step 3: Build the Workflow Actions

Add the following actions in order:

#### 3a. Tag + Pipeline Entry (Immediate)

1. **Add Tag** → `new lead`
2. **Add Tag** → `nurture - active`
3. **Create/Update Opportunity**
   - Pipeline: **Consultations**
   - Stage: **New Lead**
   - Opportunity Name: `{{contact.full_name}} - Website Lead`
   - Status: Open

#### 3b. Email 1 — Welcome (Immediate)

4. **Send Email**
   - Subject: `Welcome to Black Iron Athletics`
   - Preview text: `You just took the hardest step.`
   - Body: paste content from `email-1-welcome.html`
   - From: Mike Manning / mike@blackironathletics.com

#### 3c. Wait + Check Before Email 2

5. **Wait** → 1 day
6. **If/Else Branch** (Contact Has Tag)
   - Condition: Contact **does NOT have** tag `consultation booked`
   - **YES branch** (no booking yet):

#### 3d. Email 2 — Social Proof (Day 1)

7. **Send Email**
   - Subject: `Here's What Our Members Say`
   - Preview text: `They were exactly where you are right now.`
   - Body: paste content from `email-2-social-proof.html`

#### 3e. Wait + Check Before Email 3

8. **Wait** → 1 day
9. **If/Else Branch** — Contact does NOT have tag `consultation booked`
   - **YES branch:**

#### 3f. Email 3 — Philosophy (Day 2)

10. **Send Email**
    - Subject: `Your First Step to Getting Stronger`
    - Preview text: `Strength isn't just built in the gym.`
    - Body: paste content from `email-3-philosophy.html`

#### 3g. Wait + Check Before Email 4

11. **Wait** → 2 days
12. **If/Else Branch** — Contact does NOT have tag `consultation booked`
    - **YES branch:**

#### 3h. Email 4 — Objections (Day 4)

13. **Send Email**
    - Subject: `Not Sure If This Is For You?`
    - Preview text: `Let's clear the air.`
    - Body: paste content from `email-4-objections.html`

#### 3i. Wait + Check Before Email 5

14. **Wait** → 3 days
15. **If/Else Branch** — Contact does NOT have tag `consultation booked`
    - **YES branch:**

#### 3j. Email 5 — Final Push (Day 7)

16. **Send Email**
    - Subject: `Your Free Consultation Is Waiting`
    - Preview text: `A personal note from Mike.`
    - Body: paste content from `email-5-final-push.html`

#### 3k. Nurture Complete

17. **Remove Tag** → `nurture - active`
18. **Add Tag** → `nurture - completed`
19. **Update Opportunity**
    - Pipeline: Consultations
    - Stage: **Contacted** (they've been fully nurtured)

### Step 4: Handle the "Consultation Booked" Exit Branch

For each **If/Else branch** above, the **NO branch** (contact HAS tag `consultation booked`) should:

1. **Remove Tag** → `nurture - active`
2. **Add Tag** → `nurture - completed`
3. **Update Opportunity**
   - Pipeline: Consultations
   - Stage: **Consultation Booked**
4. **End workflow** (contact exits nurture early)

---

## Separate Workflow: Consultation Booking Trigger

Create a second small workflow to tag contacts when they book:

1. **Trigger:** Appointment Status > **"Confirmed"** (Calendar: Consultations)
2. **Add Tag** → `consultation booked`
3. **Update Opportunity**
   - Pipeline: Consultations
   - Stage: **Consultation Booked**

This ensures the nurture workflow's If/Else checks work correctly — when someone books, the tag gets applied, and the next check in the nurture sequence will detect it and exit them early.

---

## Separate Workflow: Post-Consultation Follow-Up

Create a third workflow for after the consultation:

1. **Trigger:** Appointment Status > **"Showed"** (Calendar: Consultations)
2. **Add Tag** → `consultation completed`
3. **Update Opportunity**
   - Pipeline: Consultations
   - Stage: **Showed**

*(Optional: Add a follow-up email or internal notification here)*

---

## Testing Procedure

1. Create a test contact with your email address
2. Submit the popup form on the website using that email
3. Verify in GHL:
   - Contact gets tags: `new lead`, `nurture - active`
   - Opportunity created in Consultations pipeline at "New Lead" stage
   - Email 1 arrives immediately
4. Wait for Day 1 email (or manually advance the workflow in GHL)
5. Test the booking exit:
   - Book a consultation using the test contact
   - Verify `consultation booked` tag is applied
   - Verify the next email in the sequence does NOT send
   - Verify opportunity moves to "Consultation Booked" stage

---

## Visual Workflow Diagram

```
FORM SUBMITTED (vw0hMdDkTCL6K5N3i7vF)
    │
    ├── Tag: "new lead" + "nurture - active"
    ├── Create Opportunity (Consultations > New Lead)
    ├── SEND Email 1: Welcome
    │
    ├── Wait 1 day
    ├── IF no "consultation booked" tag ──→ SEND Email 2: Social Proof
    │   └── ELSE ──→ Exit nurture (remove active tag, add completed, update pipeline)
    │
    ├── Wait 1 day
    ├── IF no "consultation booked" tag ──→ SEND Email 3: Philosophy
    │   └── ELSE ──→ Exit nurture
    │
    ├── Wait 2 days
    ├── IF no "consultation booked" tag ──→ SEND Email 4: Objections
    │   └── ELSE ──→ Exit nurture
    │
    ├── Wait 3 days
    ├── IF no "consultation booked" tag ──→ SEND Email 5: Final Push
    │   └── ELSE ──→ Exit nurture
    │
    └── Remove "nurture - active" + Add "nurture - completed"
        Update Opportunity → Contacted
```
