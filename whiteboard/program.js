/* ==========================================================================
   BLACK IRON COACH BOARD: the week's programming.

   One entry per date. Each day is a list of sections, played in order.
   Each section sets its own clock, so the coach can press play and go.

   Clock types (all times in seconds unless the name says min):
     { type: "down",  min: 10 }                  count down
     { type: "up",    cap: 15 }                  count up, stops at the cap (minutes)
     { type: "up" }                              count up, no cap
     { type: "emom",  every: 150, rounds: 6 }    every 2:30 for 6 rounds
     { type: "amrap", min: 10 }                  count down, labelled AMRAP
     { type: "tabata", work: 20, rest: 10, rounds: 8 }   work/rest intervals

   Every class is one hour. Time the sections don't use becomes prep time at
   the start of each section after the warm-up (it runs on that section's
   screen, then its own clock starts), plus a cool-down of up to 5 minutes, so
   Auto clock runs the whole class and finishes on the hour. Optional per section:
     transition: ["Grab a box", "Water break"]   what its prep time says
   Per day (or for the whole program): transitions: false   turns them off.

   Text shortcuts: *word* = Forge yellow.
   ========================================================================== */

window.COACH_PROGRAM = {
  timezone: "America/Chicago",

  // Class start times by weekday (Monday = 1 ... Sunday = 0). Each class runs 60 minutes.
  schedule: {
    1: ["5:15", "6:15", "9:30", "12:00", "16:30", "17:30", "18:30"],
    2: ["5:15", "6:15", "9:30", "12:00", "16:30", "17:30"],
    3: ["5:15", "6:15", "9:30", "12:00", "16:30", "17:30", "18:30"],
    4: ["5:15", "6:15", "9:30", "12:00", "16:30", "17:30"],
    5: ["5:15", "6:15", "9:30", "12:00", "16:30", "17:30", "18:30"],
    6: ["9:30"],
    0: []
  },
  classMinutes: 60,
  // The "next class" countdown starts this many minutes before the day's first class.
  // Before that (and after the last class) the board shows the branded centerpiece.
  morningCountdownMinutes: 60,

  // Clock sound for every screen (see /whiteboard/sounds.html). A screen can pick its own in Clock settings.
  sound: "go-high",

  // The block on the board header. A day can set its own `cycle` to override it.
  cycle: "Rally Point",

  days: {
    "2026-11-23": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Warm up", min: 6, clock: { type: "down", min: 6 },
          blocks: [ { head: "Row-ling", items: ["100m (+/-) = Burpees"] } ],
          notes: "Burpee penalty capped at 6." },
        { name: "Strength", min: 20, clock: { type: "down", min: 20 },
          transition: ["Set up your bench", "Load your bar and grab a KB pair", "Coach briefs the lift"],
          blocks: [ { head: "Bench Press", items: ["8-8-4-4-2-2"] },
                    { head: "Superset", items: ["16 Alt KB Gorilla Rows after each set"] } ],
          levels: [["1/F&F", "Keep the rep scheme at 8 reps"], ["2", "As written"]] },
        { name: "Conditioning", min: 25, clock: { type: "up", cap: 25 },
          transition: ["Water break", "Find your partner", "Claim a rower"],
          blocks: [ { head: "In teams of 2, for time", items: ["1600m Row", "80 Push-ups", "80 Sit-ups", "800m Row", "40 Push-ups", "40 Sit-ups", "400m Row", "20 Push-ups", "20 Sit-ups"] } ],
          notes: "Everything is split evenly, with *one person working at a time*.",
          levels: [["1/F&F", "1200m/60-60, 600m/30-30, 300m/15-15, elevated push-ups to a box or bench"], ["2", "As written"], ["3", "2000m/100-100, 1000m/50-50, 500m/25-25"]] }
      ]
    },

    "2026-11-24": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["Knee Pulls", "Quad Pulls", "Air Squats", "Heel Scoops", "Lunges", "Air Squats", "High Knees", "Butt Kicks", "Air Squats"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          transition: ["Load your bar in the rack", "Find your front rack", "Coach briefs the lift"],
          blocks: [ { head: "Front Squat", items: ["Build to a heavy 2 reps"] } ],
          levels: [["1/F&F", "KB Goblet Squat, 10 sets of 10 reps"], ["2", "As written"]] },
        { name: "Conditioning", min: 15, clock: { type: "emom", every: 60, rounds: 15 },
          transition: ["Water break", "Grab a wall ball, a rope and your DBs", "Find a bike"],
          blocks: [ { head: "EMOM for 15 minutes", items: ["1: Max reps Wall Balls @ 20/14", "2: Max reps Burpees", "3: Max Calorie Bike", "4: Max reps Double Unders", "5: Max reps DB Reverse Lunges @ 40/20"] } ],
          levels: [["1/F&F", "Air Squats, no push-up Burpees, singles and BW Reverse Lunges"], ["2", "As written"], ["3", "DBs @ 50/30"]] }
      ]
    },

    "2026-11-25": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Warm up", min: 8, clock: { type: "down", min: 8 },
          blocks: [ { head: "For effort", items: ["2 minutes of Bike, Row or Ski", "15 Band Pull Aparts", "10 Push-up to Pike", "10 Scap Pull-ups", "10 Arnold Press (light)"] } ] },
        { name: "Strength", min: 30, clock: { type: "up", cap: 30 },
          transition: ["Grab your DBs and a bench", "Find your pull-up spot", "Coach walks through A and B"],
          blocks: [ { head: "A) 3 to 4 rounds", items: ["8 to 10 Seated DB Shoulder Press", "5 to 8 Strict Pull-ups"] },
                    { head: "B) 3 to 4 rounds", items: ["10 to 12 DB Floor Press", "12 to 15 DB Reverse Fly", "12 to 15 DB Lateral Raises (light)"] } ],
          notes: "A) Build on the press across the rounds. The last round should be *heavy and still strict*. B) Moderate weight. Quality contractions and full range of motion.",
          levels: [["1/F&F", "Lighter DBs, Ring Rows or Banded Pull-ups"], ["2", "As written"], ["3", "Weighted Strict Pull-ups"]] },
        { name: "Conditioning", min: 12, clock: { type: "amrap", min: 12 },
          transition: ["Water break", "Grab your DBs and a 20\" box", "Pick your machine or run"],
          blocks: [ { head: "AMRAP in 12 minutes, 2-4-6…", items: ["Calories: Row, Bike, Ski or Run", "DB Box Step-overs @ 40/20 on a 20\" box"] } ],
          levels: [["1/F&F", "Body weight step-overs or lunges"], ["2", "As written"], ["3", "DBs @ 50/30"]] }
      ]
    },

    "2026-11-26": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Closed", min: 60, clock: { type: "up" },
          blocks: [ { head: "Happy Thanksgiving", items: ["The gym is closed today"] } ],
          notes: "Back at it *Friday*." }
      ]
    },

    "2026-11-27": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Core", min: 4, clock: { type: "tabata", work: 20, rest: 10, rounds: 8 },
          blocks: [ { head: "Tabata: 20 on, 10 off x 8 rounds", items: ["Plank Shoulder Taps"] } ],
          levels: [["1/F&F", "Plank Hold"], ["2", "As written"]] },
        { name: "Warm up", min: 6, clock: { type: "down", min: 6 },
          blocks: [ { head: "For effort", items: ["10 Good Mornings", "10 Glute Bridges", "30 second Wall Sit", "10 Alt DB Deadlifts", "10 Air Squats"] } ] },
        { name: "Strength", min: 20, clock: { type: "down", min: 20 },
          transition: ["Load your bar", "Grab a DB for pull throughs", "Coach briefs the lift"],
          blocks: [ { head: "Romanian Deadlift (RDL)", items: ["5 to 6 sets of 8 reps"] },
                    { head: "Superset", items: ["8 Alt DB Pull Throughs"] } ],
          levels: [["1/F&F", "KB or DB Deadlifts, 6 sets of 8 reps"], ["2", "As written"], ["3", "From a deficit"]] },
        { name: "Conditioning", min: 15, clock: { type: "amrap", min: 15 },
          transition: ["Water break", "Load your bar @ 135/95", "Grab a medball"],
          blocks: [ { head: "AMRAP in 15 minutes", items: ["5 PWR Cleans @ 135/95", "10 Alt Lateral Medball Slams", "20 Air Squats"] } ],
          levels: [["1/F&F", "DB Hang PWR Cleans or DB PWR Cleans, Air Squat to a medball"], ["2", "As written"], ["3", "Barbell @ 155/105"]] }
      ]
    },

    "2026-11-28": {
      week: "W1 Friends & Family",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["100m Shuttle Run", "Knee Pulls", "Quad Pulls", "Heel Scoops", "Lunges", "Leg Swings", "High Knees", "Butt Kicks", "Inside Heel Taps (in place)", "Outside Heel Taps (in place)", "100m Shuttle Run"] } ] },
        { name: "Conditioning", min: 40, clock: { type: "up", cap: 40 },
          transition: ["Water break", "Find your team", "Load the sled and grab your DBs"],
          blocks: [ { head: "In teams of 2 or 3, for time (40 minute cap)", items: ["400m Run (together)", "80 Alt DB Snatch @ 40/20", "400m Run (together)", "100 Calorie Row/Bike/Ski", "400m Run (together)", "400m Sled Drag @ 140/95", "400m Run (together)", "80 DB Walking Lunges @ 40/20"] } ],
          notes: "One person working at a time. Split the reps any way you'd like, but *run together*. Teams of 3: the work goes to 90 reps and 120 calories, everything else stays the same.",
          levels: [["1/F&F", "200m Runs, lighter DB and sled, BW Lunges"], ["2", "As written"], ["3", "DBs @ 50/30"]] }
      ]
    }
  }
};
