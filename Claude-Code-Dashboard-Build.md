# CLAUDE CODE KICKOFF — ATHLETE DASHBOARD BUILD
# Paste this into Claude Code to get started.

---

I'm adding an athlete dashboard to my existing website blackironathletics.com. The site already has 10 Blueprint pages built and live. I need to build an interactive dashboard page that replaces the current blueprint-how-to-use.html page, powered by a Supabase database that's already set up.

## MY SETUP

**Website:** blackironathletics.com — custom HTML/CSS/JS, hosted on GitHub
**Font:** Montserrat (Google Fonts)
**Design:** Dark theme, black background, white text
**Membership:** MemberSpace (already installed, handles payments and page access)
**Database:** Supabase (tables already created)

**Supabase Project URL:** https://hmwfpwcookrwgsbnutyc.supabase.co
**Supabase Publishable Key:** [I'll paste this when you need it]

**CSS Color Variables (already in use across the site):**
```css
--black: #000000;
--dark-gray: #1a1a1a;
--medium-gray: #333333;
--light-gray: #cccccc;
--white: #ffffff;
--yellow: #FFD202;
--phase-maintain: #2E86C1;
--phase-cut: #ff0003;
--phase-build: #27AE60;
```

## DESIGN REFERENCE

Read my existing blueprint-phase-2-cut.html (or any of the blueprint phase pages) as the design template. The dashboard must match the exact same nav, footer, sub-nav, hero section style, typography, and responsive behavior. It should feel like a natural part of the Blueprint section, not a separate app.

The dashboard replaces blueprint-how-to-use.html in the Blueprint sub-nav. The sub-nav link should change from "How to Use" to "Dashboard" (or "My Dashboard").

## SUPABASE DATABASE TABLES (already created)

```
profiles
- id (UUID, linked to auth.users)
- email, full_name
- current_phase (1-4)
- start_year
- membership_status (active/cancelled/paused)
- memberspace_id

saved_macros
- user_id, phase (1-4), year
- calories, protein_g, carbs_g, fat_g
- weight_lbs, activity_level, calculated_at
- UNIQUE(user_id, phase, year)

weight_log
- user_id, weight_lbs, logged_at (date)
- phase (1-4), notes

phase_history
- user_id, phase (1-4), year
- start_weight, end_weight, start_date, end_date
- completed (boolean), notes
- UNIQUE(user_id, phase, year)

checklist_progress
- user_id, phase (1-4), year
- item_key, checked (boolean), checked_at
- UNIQUE(user_id, phase, year, item_key)

body_comp_log
- user_id, logged_at (date), phase (1-4)
- source (inbody/dexa/manual/other)
- body_fat_pct, skeletal_muscle_mass_lbs, total_body_water_lbs
- weight_lbs, lean_body_mass_lbs, body_fat_mass_lbs
- inbody_score, basal_metabolic_rate
- waist_in, hip_in, chest_in, arm_in, thigh_in
- notes
```

Row-level security is enabled on all tables. Users can only read/write their own data. A trigger auto-creates a profile row when a new user signs up through Supabase Auth.

## SUPABASE JS CLIENT

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
    const { createClient } = supabase;
    const sb = createClient(
        'https://hmwfpwcookrwgsbnutyc.supabase.co',
        'PUBLISHABLE_KEY_HERE'
    );
</script>
```

## AUTH FLOW

MemberSpace controls who can access the page (payment gate). Once on the page, the user authenticates with Supabase to load/save their personal data. We need a simple Supabase auth flow:
- If not logged into Supabase: show a login/signup form (email + password)
- If logged in: show the dashboard with their data
- Include logout functionality
- First-time users: Supabase Auth signup creates their profile row automatically (trigger already exists)

## WHAT TO BUILD: ATHLETE DASHBOARD

Build blueprint-dashboard.html (replacing blueprint-how-to-use.html) with these sections:

### 1. PHASE STATUS BANNER
- Large, color-coded banner showing current phase name and color
- "PHASE 2: CUT — April 1 to June 30" (auto-calculated from current date)
- Days remaining in current phase + countdown
- Progress bar showing how far through the phase they are

### 2. MY MACROS (current phase)
- Display saved macro targets for the current phase: calories, protein, carbs, fat
- If no macros saved for current phase: show prompt "Calculate your macros for this phase" with link to macro-calculator.html
- "Save My Macros" form: input fields for calories, protein, carbs, fat, current weight — saves to saved_macros table
- "Recalculate" button linking to the macro calculator

### 3. WEIGHT TRACKER
- Input field: weight + date + optional notes
- "Log Weight" button — saves to weight_log table
- Line chart (use Chart.js) showing weight over time
- Chart has colored background bands for each phase so you can see trends per phase
- Show: starting weight (beginning of current phase), current weight, change

### 4. BODY COMPOSITION
- "Log Body Comp" button that opens a modal/form
- Form fields grouped by source type:
  - InBody/DEXA: body fat %, skeletal muscle mass, lean body mass, body fat mass, total body water, InBody score, BMR
  - Manual: waist, hip, chest, arm, thigh measurements
  - Source dropdown: InBody, DEXA, Manual, Other
- Display latest body comp entry as a summary card
- Chart showing body fat % and skeletal muscle mass trends over time (dual axis or two charts)

### 5. PHASE TRANSITION CHECKLIST
- Show checklist items for the NEXT phase transition (the one coming up)
- Interactive checkboxes that save to checklist_progress table
- Phase 1→2 checklist items: weight stable ±2-3 lbs for 2-3 weeks, tracking consistently for 4+ weeks, recalculated macros for "Lose Fat", mentally ready for 12-week deficit
- Phase 2→3 checklist items: completed full 12-week cut, recalculated macros for "Maintain", understand reverse diet is gradual, taken progress photos
- Phase 3→4 checklist items: weight stable ±2-3 lbs for 3-4 weeks, energy and gym performance back to baseline, recalculated macros for "Build Muscle", understand weight will go up
- Phase 4→1 checklist items: completed full 12-week build, recalculated macros for "Maintain", understand maintenance will feel like less food, taken progress photos for year-over-year comparison

### 6. YEAR-OVER-YEAR SUMMARY
- Show completed phases from phase_history table
- For each completed phase: start weight, end weight, change, dates
- If Year 2+: side-by-side comparison with previous year
- "Year [X] Complete" indicator when all 4 phases are done

### 7. QUICK LINKS
- Button: "Go to Phase [X] Guide" → links to current phase page
- Button: "Open Macro Calculator" → macro-calculator.html (new tab)
- Button: "Supplement Protocols" → blueprint-supplements.html
- Button: "The Decade Roadmap" → blueprint-decade.html

## LAYOUT

Match the existing Blueprint page layout. The dashboard sections should stack vertically with clear section headers, consistent spacing, and the dark theme. Use cards/panels with subtle borders or background shading to separate sections (look at how the existing phase pages handle content sections).

Mobile responsive — everything must work on phones. The charts should resize properly.

## BUILD ORDER

1. First: read my existing blueprint phase pages to understand the design system
2. Build the page structure with all sections (static HTML/CSS first)
3. Wire up Supabase auth (login/signup/logout)
4. Wire up each section to read/write from Supabase
5. Add Chart.js for weight and body comp charts
6. Test the full flow

Start by reading my existing blueprint pages, then build the dashboard. Show me the static layout first before wiring up Supabase.
