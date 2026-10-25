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

  cycle: "Harder to Kill",

  days: {
    "2026-10-12": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 15, clock: { type: "down", min: 15 },
          blocks: [
            { head: "5 minutes for effort", items: ["10/10 PVC Around the Worlds", "10 Alt World’s Greatest Stretch", "10 Burpee into Squat", "10 Heel Elevated Goblet Squats", "10 Plate GTO"] },
            { head: "Then 3 rounds of (PVC or empty bar)", items: ["10 Back Squat @ 33X2 tempo", "5 to 10 BTN SG Press", "5 to 10 OHS", "5 to 10 Snatch Balance"] }
          ] },
        { name: "Weightlifting", min: 15, clock: { type: "emom", every: 150, rounds: 6 },
          blocks: [ { head: "Every 2:30 for 6 rounds", items: ["2 Snatch from Position 3 (hip)"] } ],
          levels: [["1", "5 SDLHP + 5 Ball Slams"], ["2", "PWR Snatch from the Hip"], ["3", "Full Snatch from the Hip"]] },
        { name: "Conditioning", min: 15, clock: { type: "up", cap: 15 },
          blocks: [ { head: "5 rounds for time", items: ["20/16 Calorie Row / Bike / Ski", "5 Man Makers @ 40/20"] } ],
          notes: "1 Man Maker = DB Push-up + Renegade Row (each side) + DB Clean + Thruster.",
          levels: [["1", "16/12 calories and lighter DBs"], ["2", "As written"]] }
      ]
    },

    "2026-10-13": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["100m Shuttle Run", "Knee Pulls", "Quad Pulls", "100m Shuttle Run", "Heel Scoops", "Lunges", "200m Run", "High Knees", "Butt Kicks"] } ] },
        { name: "Intervals", min: 24, clock: { type: "up", cap: 24 },
          blocks: [ { head: "6 rounds, each for time", items: ["Run 400m (timed)", "Walk 200m (completion only)"] } ],
          levels: [["1a", "1km Bike (timed), then 0.5km Bike (completion)"], ["1b", "500m Row (timed), then 250m Row (completion)"], ["2", "As written"]] },
        { name: "Strength", min: 16, clock: { type: "down", min: 16 },
          blocks: [ { head: "For effort", items: ["80’ Sled Push (*heavy*)", "100m Farmers Carry @ 53/35"] } ],
          notes: "Challenge yourself on the weights and keep moving." }
      ]
    },

    "2026-10-14": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 7, clock: { type: "down", min: 7 },
          blocks: [ { items: ["7 Burpees", "7 KB Deadlift", "7 Russian KB Swings", "14 Alt KB Lunges", "30 second Plank Hold", "30 second Arch Hold"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Sumo Deadlift", items: ["4 sets of 5 reps (clusters)", "1 set of max reps (TNG) @ 75% of top set from above"] } ],
          notes: "Clusters are singles with 10 to 15 seconds between reps: 1×1×1×1×1. *Heavier than last week.*" },
        { name: "Conditioning", min: 15, clock: { type: "up", cap: 15 },
          blocks: [ { head: "3 rounds for time", items: ["Run 400m", "Max reps Bench Press @ 100/70%", "Rest 1 minute between rounds"] } ],
          notes: "For every rep you get on bench press, subtract 1 second off your time for that round." }
      ]
    },

    "2026-10-15": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 8, clock: { type: "down", min: 8 },
          blocks: [ { head: "For effort", items: ["1 minute Row", "15 Band Pull Aparts", "15 Good Mornings", "10 Empty Bar Bent Over Rows with a 4 second negative"] } ] },
        { name: "Strength", min: 12, clock: { type: "emom", every: 120, rounds: 6 },
          blocks: [ { head: "Barbell Bent Over Row", items: ["Every 2 minutes for 6 rounds", "6 reps"] } ],
          notes: "Build across the 6 rounds. Last set should be heavy and still clean.",
          levels: [["1", "DB Bent Over Rows, both arms"], ["2", "As designed"]] },
        { name: "Body building", min: 15, clock: { type: "down", min: 15 },
          blocks: [ { head: "3 to 5 rounds", items: ["8 to 12 DB Reverse Fly (moderate)", "8 to 12 Inverted Bent Over Row", "8 to 12 DB Front Raise (light)", "6 to 8 Half Kneeling DB Halos (each direction)"] } ],
          notes: "Last 2 to 4 reps, do a 5 second negative. Switch the kneeling position when you change directions, clockwise to counterclockwise." },
        { name: "Conditioning", min: 20, clock: { type: "down", min: 20 },
          blocks: [ { head: "Zone 2 steady state", items: ["Choose your modality: Row, Bike, Ski or Jog"] } ],
          notes: "Conversational pace. You should be able to hold a full conversation the entire time. No intervals, no pushing. Active recovery and aerobic base." }
      ]
    },

    "2026-10-16": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["10/10 Toe/Calf Raises", "20 Mountain Climbers", "10 Alt World’s Greatest Stretch", "100m Shuttle Run", "10 KB Goblet Squats @ 32X1 tempo"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Back Squats", items: ["4 sets of 5 reps @ 5XX2 tempo", "1 set of max reps with no tempo @ top set from above"] } ],
          notes: "*Heavier than last week.*" },
        { name: "Conditioning", min: 10, clock: { type: "amrap", min: 10 },
          blocks: [ { head: "AMRAP in 10 minutes: 5-10-15…", items: ["Air Squats", "Sit-ups", "Double Unders (x2)"] } ],
          notes: "2 Wall Walks after each round.",
          levels: [["1", "Singles, Inch Worms instead of Wall Walks"], ["2", "As written"], ["3", "GHD Sit-ups"]] }
      ]
    },

    "2026-10-17": {
      week: "W4 Build",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["100m Shuttle Run", "Knee Pulls", "Quad Pulls", "100m Shuttle Run", "Heel Scoops", "Lunges", "100m Run", "10 Push-ups", "10 No Push Burpees"] } ],
          notes: "Load as you go, and be at your conditioning weight by the end." },
        { name: "Conditioning", min: 45, clock: { type: "up", cap: 45 },
          blocks: [ { head: "20 rounds for time", items: ["10 Alt DB Snatch @ 40/20", "8 Push-ups", "4 Burpees", "100m Shuttle Run"] } ] }
      ]
    },

    "2026-10-19": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 5, clock: { type: "down", min: 5 },
          blocks: [ { head: "5 minutes for effort", items: ["10/10 PVC Around the Worlds", "10 Alt World’s Greatest Stretch", "10 Burpee into Squat", "10 Heel Elevated Goblet Squats", "10 Plate GTO"] } ] },
        { name: "Barbell warm-up", min: 10, clock: { type: "down", min: 10 },
          transition: ["Grab a PVC or an empty bar", "Find your space on the floor", "Coach walks through the movements"],
          blocks: [ { head: "3 rounds (PVC or empty bar)", items: ["10 Back Squat @ 33X2 tempo", "5 to 10 BTN SG Press", "5 to 10 OHS", "5 to 10 Snatch Balance"] } ] },
        { name: "Weightlifting", min: 15, clock: { type: "emom", every: 150, rounds: 6 },
          blocks: [ { head: "Every 2:30 for 6 rounds", items: ["2 Snatch from Position 2 (knee)"] } ],
          levels: [["1", "5 Muscle Snatch or 5 SDLHP"], ["2", "PWR Snatch from the Knee"], ["3", "Full Snatch from the Knee"]] },
        { name: "Conditioning", min: 15, clock: { type: "up", cap: 15 },
          blocks: [ { head: "For time", items: ["80 Double Unders", "60/45 Calorie Row / Bike / Ski", "40 Burpees", "20 Box Jumps @ 24/20", "10 Wall Walks"] } ],
          levels: [["1", "Singles, 50/35 calories, no push burpees, plate jumps and inch worms"], ["2", "As written"], ["3", "75/60 calories and box @ 30/24"]] }
      ]
    },

    "2026-10-20": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["100m Shuttle Run", "Knee Pulls", "Quad Pulls", "100m Shuttle Run", "Heel Scoops", "Lunges", "200m Run", "High Knees", "Butt Kicks"] } ] },
        { name: "Intervals", min: 24, clock: { type: "up", cap: 24 },
          transition: ["Water and a bathroom break", "Level 1: grab a bike or a rower", "Coach walks through the intervals"],
          blocks: [ { head: "3 rounds, each for time", items: ["Run 800m (timed)", "Walk 200m (completion only)"] } ],
          levels: [["1a", "2km Bike (timed), then 0.5km Bike (completion)"], ["1b", "1000m Row (timed), then 250m Row (completion)"], ["2", "As written"]] },
        { name: "Strength", min: 12, clock: { type: "down", min: 12 },
          transition: ["Water break", "Grab your carry weights, a DB and a plate", "Coach walks through the movements"],
          blocks: [ { head: "For effort", items: ["100m Farmers Carry", "20 Alt DB Pull Throughs", "20 Alt Plate Russian Twists"] } ],
          notes: "Challenge yourself on the weights and keep moving." }
      ]
    },

    "2026-10-21": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 7, clock: { type: "down", min: 7 },
          blocks: [ { items: ["7 Burpees", "7 KB Deadlift", "7 Russian KB Swings", "14 Alt KB Lunges", "30 second Plank Hold", "30 second Arch Hold"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Sumo Deadlift", items: ["4 sets of 3 reps (clusters)", "1 set of max reps (TNG) @ 75% of top set from above"] } ],
          notes: "Clusters are singles with 10 to 15 seconds between reps: 1×1×1. *Heavier than last week.*" },
        { name: "Conditioning", min: 10, clock: { type: "amrap", min: 10 },
          blocks: [ { head: "AMRAP in 10 minutes", items: ["10 Push-ups", "5 DB Hang PWR Cleans @ 40/20", "5 DB STO", "10 DB Squats"] } ],
          levels: [["1", "Modified push-ups and a lighter DB"], ["2", "As written"], ["3", "DBs @ 50/30"]] }
      ]
    },

    "2026-10-22": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 7, clock: { type: "down", min: 7 },
          blocks: [ { head: "For effort", items: ["100m Run", "200m Row", "10 Burpees", "20 Banded Pull Aparts"] } ] },
        { name: "Strength", min: 15, clock: { type: "emom", every: 60, rounds: 15 },
          transition: ["Grab your bar for shoulder press", "Find your pull-up spot", "Coach briefs the EMOM"],
          blocks: [ { head: "EMOM for 15 minutes", items: ["Minute 1: 3 to 5 Shoulder Press", "Minute 2: Max reps unbroken Strict Pull-ups", "Minute 3: Rest"] } ],
          levels: [["1", "Banded Pull-ups or Ring Rows"], ["2", "As written"]] },
        { name: "Conditioning", min: 35, clock: { type: "up", cap: 35 },
          blocks: [ { head: "For time", items: ["Ski 1000m", "Run 1600m", "Row 2000m", "Bike 5km"] } ],
          notes: "Can be done in any order.",
          levels: [["1", "Pick 3"], ["2", "As written"]] }
      ]
    },

    "2026-10-23": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 8, clock: { type: "down", min: 8 },
          blocks: [ { items: ["10/10 Toe/Calf Raises", "20 Mountain Climbers", "10 Alt World’s Greatest Stretch", "100m Shuttle Run", "10 KB Goblet Squats @ 32X1 tempo"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Back Squats", items: ["4 sets of 3 reps @ 5XX2 tempo", "1 set of max reps with no tempo @ top set from above"] } ],
          notes: "*Heavier than last week.*" },
        { name: "Conditioning", min: 12, clock: { type: "up", cap: 12 },
          blocks: [
            { head: "For time: 21-15-9", items: ["Air Squats", "Sit-ups"] },
            { head: "Rest 1 minute, then 15-9-3", items: ["Front Squats @ 135/95", "Toes to Bar"] }
          ],
          levels: [["1", "KB Goblet Squats or a lighter bar, and Knee Tucks"], ["2", "As written"]] }
      ]
    },

    "2026-10-24": {
      week: "W5 Build",
      sections: [
        { name: "Warm up", min: 6, clock: { type: "down", min: 6 },
          blocks: [ { head: "In 2 teams", items: ["Ski-lay race"] } ],
          notes: "Losing team does 10 synchronized burpees." },
        { name: "Loading", min: 5, clock: { type: "down", min: 5 },
          transition: ["Water break", "Grab a bench, a bar and plates", "Find your partner"],
          blocks: [ { items: ["Load your bench press to a good opening weight"] } ] },
        { name: "Strength", min: 15, clock: { type: "emom", every: 180, rounds: 5 },
          transition: ["Last check on your opening weight", "Grab your dumbbells for curls", "Coach briefs the sets"],
          blocks: [ { head: "Every 3 minutes for 5 rounds", items: ["8 to 12 Bench Press", "8 to 12 DB Curls (each arm)"] } ] },
        { name: "Conditioning", min: 20, clock: { type: "down", min: 20 },
          blocks: [ { head: "In partners", items: ["Max calories in 20 minutes"] } ],
          notes: "Only one person works at a time. Switch at any interval. Any combination of cardio machines." }
      ]
    },
    "2026-10-26": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 5, clock: { type: "down", min: 5 },
          blocks: [ { head: "5 minutes for effort", items: ["10/10 PVC Around the Worlds", "10 Alt World’s Greatest Stretch", "10 Burpee into Squat", "10 Heel Elevated Goblet Squats", "10 Plate GTO"] } ] },
        { name: "Barbell warm-up", min: 10, clock: { type: "down", min: 10 },
          transition: ["Grab a PVC or an empty bar", "Find your space on the floor", "Coach walks through the movements"],
          blocks: [ { head: "3 rounds (PVC or empty bar)", items: ["10 Back Squat @ 33X2 tempo", "5 to 10 BTN SG Press", "5 to 10 OHS", "5 to 10 Snatch Balance"] } ] },
        { name: "Weightlifting", min: 15, clock: { type: "emom", every: 150, rounds: 6 },
          blocks: [ { head: "Every 2:30 for 6 rounds", items: ["2 Snatch from Position 2 (knee)"] } ],
          levels: [["1", "5 Muscle Snatch or 5 SDLHP"], ["2", "PWR Snatch from the Knee"], ["3", "Full Snatch from the Knee"]] },
        { name: "Conditioning", min: 15, clock: { type: "up", cap: 15 },
          transition: ["Water break", "Grab a DB and a box", "Coach walks through the rounds"],
          blocks: [ { head: "3 rounds for time", items: ["Run 400m", "20 Alt DB Snatch @ 40/20", "20 Box Jump Overs @ 24/20"] } ],
          levels: [["1", "Bike 1km, a lighter DB and plate jumps"], ["2", "As written"], ["3", "DB @ 50/30 and box @ 30/24"]] }
      ]
    },

    "2026-10-27": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 10, clock: { type: "down", min: 10 },
          blocks: [ { items: ["100m Shuttle Run", "Knee Pulls", "Quad Pulls", "100m Shuttle Run", "Heel Scoops", "Lunges", "200m Run", "High Knees", "Butt Kicks"] } ] },
        { name: "Intervals", min: 24, clock: { type: "up", cap: 24 },
          transition: ["Water and a bathroom break", "Level 1: grab a bike or a rower", "Coach walks through the intervals"],
          blocks: [ { head: "3 rounds, each for time", items: ["Run 800m (timed)", "Walk 200m (completion only)"] } ],
          levels: [["1a", "2km Bike (timed), then 0.5km Bike (completion)"], ["1b", "1000m Row (timed), then 250m Row (completion)"], ["2", "As written"], ["3", "4 rounds"]] },
        { name: "Strength", min: 12, clock: { type: "down", min: 12 },
          transition: ["Water break", "Grab your carry weights, a DB and a plate", "Coach walks through the movements"],
          blocks: [ { head: "For effort", items: ["100m Farmers Carry", "20 Alt DB Pull Throughs", "20 Alt Plate Russian Twists"] } ],
          notes: "Challenge yourself on the weights and keep moving." }
      ]
    },

    "2026-10-28": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 7, clock: { type: "down", min: 7 },
          blocks: [ { items: ["7 Burpees", "7 KB Deadlift", "7 Russian KB Swings", "14 Alt KB Lunges", "30 second Plank Hold", "30 second Arch Hold"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Sumo Deadlift", items: ["4 sets of 3 reps (clusters)", "1 set of max reps (TNG) @ 75% of top set from above"] } ],
          notes: "Clusters are singles with 10 to 15 seconds between reps: 1×1×1. *Heavier than last week.*" },
        { name: "Conditioning", min: 8, clock: { type: "amrap", min: 8 },
          transition: ["Water break", "Load your bar for power cleans", "Coach walks through the AMRAP"],
          blocks: [ { head: "AMRAP in 8 minutes", items: ["8 PWR Cleans @ 135/95", "8 Burpees Over the Bar"] } ],
          levels: [["1", "DBs or a lighter bar, burpees with a jump"], ["2", "As designed"], ["3", "Barbell @ 165/115"]] }
      ]
    },

    "2026-10-29": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 7, clock: { type: "down", min: 7 },
          blocks: [ { head: "Row-ling", items: ["100m (+/-) m = Burpees"] } ] },
        { name: "Strength", min: 20, clock: { type: "down", min: 20 },
          transition: ["Grab a bench, a bar and plates", "Find your spotter", "Coach walks through the sets"],
          blocks: [
            { head: "Bench Press", items: ["Build to a heavy single for the day"] },
            { head: "Then", items: ["Max reps @ 75% of top single", "Max reps @ 50% of top single"] }
          ] },
        { name: "Conditioning", min: 15, clock: { type: "up", cap: 15 },
          transition: ["Water break", "Find your partner and a rower", "Coach walks through the rounds"],
          blocks: [ { head: "In partners, for time", items: ["Row 500m · 25 Push-ups · 25 Sit-ups", "Row 400m · 20 Push-ups · 20 Sit-ups", "Row 300m · 15 Push-ups · 15 Sit-ups", "Row 200m · 10 Push-ups · 10 Sit-ups", "Row 100m · 5 Push-ups · 5 Sit-ups"] } ],
          notes: "Partner A rows while Partner B does the push-ups and sit-ups. Switch. Both finish both, then next round. One rower: finish early, wait for it.",
          levels: [["1", "Skip the first round (500m and 25/25), modified push-ups"], ["2", "As written"]] }
      ]
    },

    "2026-10-30": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 8, clock: { type: "down", min: 8 },
          blocks: [ { items: ["10/10 Toe/Calf Raises", "20 Mountain Climbers", "10 Alt World’s Greatest Stretch", "100m Shuttle Run", "10 KB Goblet Squats @ 32X1 tempo"] } ] },
        { name: "Strength", min: 25, clock: { type: "down", min: 25 },
          blocks: [ { head: "Back Squats", items: ["4 sets of 3 reps @ 5XX2 tempo", "1 set of max reps with no tempo @ top set from above"] } ],
          notes: "*Heavier than last week.*" },
        { name: "Conditioning", min: 12, clock: { type: "up", cap: 12 },
          transition: ["Water break", "Grab a wall ball and a target", "Set up a rower or ski erg next to you"],
          blocks: [ { head: "For time", items: ["100 Wall Balls @ 20/14"] } ],
          notes: "Every time you stop or drop the ball, Row or Ski 12/8 calories.",
          levels: [["1", "5 rounds for time: 20 Air Squats, 10/7 calories"], ["2", "As written"], ["3", "15/10 calories"]] }
      ]
    },

    "2026-10-31": {
      week: "W6 Build",
      sections: [
        { name: "Warm up", min: 8, clock: { type: "down", min: 8 },
          blocks: [ { items: ["Knee Pulls", "Quad Pulls", "Heel Scoops", "Lunges", "Inside Heel Taps", "Outside Heel Taps"] } ] },
        { name: "Barbell warm-up", min: 5, clock: { type: "down", min: 5 },
          blocks: [ { head: "From the hang", items: ["Clean Extensions", "Clean Pulls", "PWR Cleans", "Front Squats", "Squat Cleans"] } ] },
        { name: "Barbell complex", min: 15, clock: { type: "down", min: 15 },
          blocks: [ { head: "In partners", items: ["Build to a heavy complex as a team", "Hang Clean + 3 Front Squats"] } ],
          notes: "One person working at a time. The clean can be a power or a squat clean." },
        { name: "Conditioning", min: 31, clock: { type: "up", cap: 31 },
          blocks: [ { head: "In partners, for time", items: ["100 Double Unders (split)", "100/80 Calorie Row (split)", "50 Deadlifts @ 225/155", "31 Synchronized Burpees", "19 Synchronized Pull-ups", "1000m Shuttle Run (relay)"] } ],
          levels: [["1", "Singles, 70/50 calories, barbell @ 185/125 and jumping pull-ups"], ["2", "As written"], ["3", "Barbell @ 275/185"]] }
      ]
    }
  }
};
