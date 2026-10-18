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
  morningCountdownMinutes: 75,

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
          notes: "Clusters are singles with 10 to 15 seconds between reps: 1*1*1*1*1. *Heavier than last week.*" },
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
    }
  }
};
