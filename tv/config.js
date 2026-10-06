/* ==========================================================================
   BLACK IRON TV: the only file you edit.

   The page at /tv reads this file, works out today's date in Frisco, and
   builds the deck. Push a change and every TV picks it up within about ten
   minutes, at the end of whatever panel it is showing. No restart needed.

   Text shortcuts, usable in any text field:
     *word*   Forge yellow
     ~word~   outlined lettering (the site's solid-interior outline)

   Panel fields every type understands:
     id        short unique name, used in /tv?panel=id and on /tv/preview
     type      which layout to draw (see README for the list)
     seconds   how long it stays up (defaults to defaultSeconds)
     from      first day it shows, "YYYY-MM-DD" (optional)
     until     last day it shows, "YYYY-MM-DD" (optional). It is gone the
               morning after.
     cycle     true = only shows while the cycle below is running
     status    "draft" = never on the TVs, only on /tv/preview
   ========================================================================== */

window.TV_CONFIG = {
  // Bump this whenever you edit. It shows in the bottom-left corner of every
  // TV, so you can tell at a glance if a screen is stuck on an old version.
  version: "2026-10-06.2",

  timezone: "America/Chicago",
  defaultSeconds: 10,

  // A live clock in the same spot on every panel, always Frisco time.
  //   "corner"  small, top right
  //   "footer"  bottom center, on the footer line
  //   "tab"     big, hanging from the top bar at top right
  //   "off"     no clock
  // Try one on /tv/preview with the Clock buttons, or /tv?clock=tab.
  clock: "off",

  /* ----------------------------------------------------------------------
     THE CYCLE
     Week dates come from `start`. You type labels, not dates.
     phase: intro | test | build | deload  (these drive the phase colors)
     ---------------------------------------------------------------------- */
  cycle: {
    name: "Harder to Kill",
    titleLines: ["Harder", "~to Kill~"],
    tagline: "Stronger. Faster. ~Harder to Kill.~",
    start: "2026-09-21",
    end: "2026-11-21",
    lifts: ["Snatch", "Sumo Deadlift", "Back Squat", "and a whole lot of running"],
    weeks: [
      { label: "Foundation", phase: "intro" },
      { label: "Test",       phase: "test",   note: "Set the numbers" },
      { label: "Build",      phase: "build" },
      { label: "Build",      phase: "build" },
      { label: "Build",      phase: "build",  note: "633 Run" },
      { label: "Build",      phase: "build",  note: "Halloween WOD" },
      { label: "Build",      phase: "build" },
      { label: "Deload",     phase: "deload", note: "Taper" },
      { label: "Retest",     phase: "test",   note: "Beat W2" }
    ]
  },

  /* Shared footers. Panels pick one with footer: "cycle" | "brand" | "chips". */
  footers: {
    chips: ["Veteran-owned", "Frisco, TX", "Est. 2013"],
    cycle: "Stronger. Faster. ~Harder to Kill.~",
    brand: "Everyday people. ~Everyday athletes.~"
  },

  /* ----------------------------------------------------------------------
     THE DECK, in play order
     ---------------------------------------------------------------------- */
  deck: [
    {
      id: "title", type: "title", seconds: 8, cycle: true, skull: "off",
      photo: { src: "/images/tv/photo-title.jpg", position: "62% 30%" }
    },

    {
      // The evening times changed in October 2026: 4:15 and 5:15 PM became
      // 4:30 and 5:30, plus a new 6:30 PM on Monday, Wednesday and Friday.
      // Today's column lights up on its own. Remove "until" to keep it up.
      id: "evening", type: "schedule", seconds: 12, until: "2026-11-08", skull: "off",
      eyebrow: "Now live",
      title: ["New evening", "~class times.~"],
      lead: "4:15 is now 4:30. 5:15 is now 5:30. And a new *6:30* on Monday, Wednesday and Friday.",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      rows: [
        { time: "4:30 PM" },
        { time: "5:30 PM" },
        { time: "6:30 PM", on: ["Mon", "Wed", "Fri"], tag: "New" }
      ],
      note: "Book in Wodify",
      footer: "chips"
    },

    {
      id: "633-run", type: "event", seconds: 10, until: "2026-10-24",
      eyebrow: "Join the team",
      title: "633 Run",
      starts: { date: "2026-10-24", time: "08:00" },
      countLabel: "To the start line",
      when: "Saturday, October 24 • 8:00 AM",
      where: "Lobo Stadium • Little Elm",
      items: [
        { label: "1 Mile Fun Run", text: "Families, kids, walkers. Everyone can do this one." },
        { label: "5K",             text: "The main event. Coach Mike is signed up." },
        { label: "6.33 Mile",      text: "Officer Walker’s badge number was 633." }
      ],
      body: ["Honoring fallen Little Elm Police Officer Jerry R. Walker.",
             "Proceeds support a public service scholarship in his name."],
      cta: "Join team “Black Iron Athletics”",
      qr: { src: "/images/tv/qr-633-run.svg", label: "Scan to sign up",
            url: "https://runsignup.com/Race/TX/LittleElm/633Run" },
      skull: "off"
    },

    {
      id: "timeline", type: "timeline", seconds: 10, cycle: true,
      eyebrow: "The timeline",
      headline: "9 Weeks",
      phases: "Foundation • Test • Build • Deload • Retest",
      note: ["Test in Week 2. Build for five. Deload. Then find out what changed.",
             "All of it finished before Thanksgiving."]
    },

    {
      id: "mission", type: "statement", seconds: 8,
      lines: ["We help *everyday*", "*people* become *everyday*", "*athletes.*"],
      sub: "Forge the body. Guard the mind.",
      photo: { src: "/images/tv/photo-mission.jpg", position: "50% 35%" },
      skull: "off"
    },

    {
      id: "coaching", type: "offer", seconds: 10,
      eyebrow: "1-on-1 coaching",
      title: ["One coach.", "~One plan.~"],
      columns: [
        { heading: "Personal Training",
          items: ["1-on-1 sessions", "Programming built around you", "Monthly body composition scans"] },
        { heading: "Nutrition Coaching",
          items: ["Weekly check-ins with your coach", "Honest feedback", "Targets that adjust as life happens"] }
      ],
      cta: "Talk to your coach",
      photo: { src: "/images/tv/photo-coaching.jpg", position: "60% 35%" },
      footer: "chips",
      skull: "off"
    },

    {
      id: "focus", type: "columns", seconds: 10, cycle: true,
      title: "The Focus",
      columns: [
        { heading: "The Lifts",  items: ["Snatch / SDLHP", "Sumo Deadlift", "Back Squat"],
          foot: "Monday • Wednesday • Friday" },
        { heading: "The Engine", items: ["Long conditioning", "Running ramps up", "Zone 2 every Thursday"],
          foot: "Tuesday • Thursday • Saturday" },
        { heading: "The Benchmarks", items: ["“The Reaper”", "“Second Wind”", "“All Grit, No Quit”"],
          foot: "@benchmarks" }
      ],
      note: "Every number you set in Week 2 gets retested in Week 9.",
      footer: "cycle"
    },

    {
      id: "reaper", type: "benchmark", seconds: 12, cycle: true,
      name: "The Reaper",
      format: ["For time", "15 min cap"],
      day: "Monday",
      movements: ["60 PWR Snatch @ 75/55", "40 Toes to Bar"],
      note: "4 Burpees over the bar EMOM until you finish. Start with 4.",
      footer: "cycle"
    },

    {
      id: "eccentric", type: "explainer", seconds: 12, cycle: true,
      eyebrow: "Why we train it",
      title: ["Eccentric", "*Strength*"],
      lead: "The lowering half of the rep. The part everybody rushes.",
      points: [
        { title: "You are stronger going down",
          text: "You can lower more weight than you can lift. Most people never use it." },
        { title: "More muscle, more control",
          text: "Slow lowering creates more tension, and tension is what builds size and strength." },
        { title: "It protects you",
          text: "Stronger tendons and connective tissue. This is the work that keeps you training." },
        { title: "You will see it all cycle",
          text: "Tempo squats, 5 second negatives, pauses. When we say slow down, slow down." }
      ],
      photo: { src: "/images/tv/photo-eccentric.jpg", position: "62% 40%" },
      tempo: 5,
      skull: "off"
    },

    {
      id: "second-wind", type: "benchmark", seconds: 12, cycle: true,
      name: "Second Wind",
      format: ["1 mile for time"],
      day: "Tuesday",
      movements: ["Run 1 Mile", "(or) 5km Bike"],
      note: "Whatever you choose in Week 2 is what you repeat in Week 9.",
      footer: "cycle"
    },

    {
      id: "snatch", type: "explainer", seconds: 12, cycle: true,
      eyebrow: "Mondays", eyebrowDay: "Monday",
      title: ["Do not be afraid", "*of the snatch*"],
      lead: "Monday is a skill day. There is an option for every person in this room.",
      points: [
        { title: "Want to learn it?",     text: "We will teach you, and we will keep it light while you do." },
        { title: "Never want to snatch?", text: "That is fine. Sumo deadlift high pull works the same pattern." },
        { title: "Already have it?",      text: "Full snatch, and we will sharpen it for nine weeks." }
      ],
      close: "Nobody is getting thrown into the deep end. Talk to your coach.",
      photo: { src: "/images/tv/photo-snatch.jpg", position: "45% 30%" },
      footer: "chips",
      skull: "off"
    },

    {
      id: "all-grit", type: "benchmark", seconds: 12, cycle: true,
      name: "All Grit, No Quit",
      format: ["3 rounds for reps"],
      day: "Friday",
      movements: ["MAX unbroken Double Unders",
                  "MAX unbroken Wall Balls @ 20/14",
                  "MAX unbroken KB Farmers Hold @ 53/35"],
      note: "One round per movement. The second you stop, the round is over.",
      footer: "cycle"
    },

    {
      id: "halloween", type: "spotlight", seconds: 8, until: "2026-10-31",
      chip: "Halloween Partner WOD",
      title: ["Grab a partner.", "*Bring a costume.*"],
      starts: { date: "2026-10-31", time: "09:30" },
      countLabel: "Until the partner WOD",
      dateLine: "Saturday • October 31 • 9:30 AM",
      sub: "Teams of 2. One workout. All of us.",
      cards: [
        { title: "Teams of 2",  text: "Pick a partner or we will pair you up" },
        { title: "Costumes",    text: "Encouraged. Judged. Loosely." },
        { title: "All levels",  text: "Scaled for everybody in the room" }
      ],
      footer: "cycle",
      skull: "pattern"
    },

    {
      id: "fuelpath", type: "fuelpath", seconds: 10,
      title: ["Nutrition,", "*coached.*"],
      points: ["Personal macro targets for every phase",
               "Log food • scan barcodes • build streaks",
               "1-on-1 coach support and monthly scans"],
      ask: "Ask any coach how to get started",
      footer: "brand",
      skull: "off"
    },

    {
      id: "programs", type: "programs", seconds: 10,
      chips: ["Veteran-owned", "Est. 2013", { count: 3000, suffix: "+", text: "lives changed" }],
      title: ["Black *Iron*", "Athletics"],
      mission: "We help everyday people become everyday athletes.",
      cards: [
        { title: "Strength & Conditioning", text: ["Our flagship program", "The pride of our gym"],
          photo: { src: "/images/tv/card-strength.jpg", position: "50% 45%" } },
        { title: "Personal Training", text: ["1-on-1 custom", "programming"],
          photo: { src: "/images/tv/card-training.jpg", position: "50% 40%" } },
        { title: "FuelPath Nutrition", text: ["Coaching, habits", "and tracking"],
          photo: { src: "/images/tv/card-fuelpath.jpg", position: "50% 70%" } },
        { title: "Open Gym", text: ["7 days a week", "between classes"],
          photo: { src: "/images/tv/card-opengym.jpg", position: "60% 40%" } }
      ],
      footer: "chips",
      skull: "off"
    },

    {
      id: "review", type: "qr", seconds: 8,
      title: ["Love training", "*here?*"],
      body: "Tell Google. It takes about a minute, and it helps the next person in Frisco find their gym.",
      stars: 5,
      steps: ["Scan", "Tap the stars", "Say what you would tell a friend"],
      qr: { src: "/images/tv/qr-google-review.svg", label: "Leave a review",
            url: "https://g.page/r/CW6NUt8JAkafEBM/review" },
      photo: { src: "/images/tv/photo-review.jpg", position: "50% 30%" },
      footer: "brand",
      skull: "off"
    },

    {
      id: "links", type: "qr", seconds: 8,
      title: ["One scan.", "Everything *you*", "*need.*"],
      list: ["Book a free consultation", "Sign the waiver", "Buy a day pass",
             "Leave us a Google review", "Class schedule and more"],
      qr: { src: "/images/tv/qr-links.svg", label: "Scan me", above: true,
            caption: "blackironathletics.com/links",
            url: "https://www.blackironathletics.com/links" },
      footer: "brand"
    },

    /* DRAFT: not on the TVs until you remove `status: "draft"`.
       Shown on /tv/preview so you can see it first. */
    {
      id: "new-gym", type: "spotlight", seconds: 8, status: "draft", cycleLabel: false,
      chip: "Coming in November",
      title: ["The new Black Iron.", "*Right next door.*"],
      dateLine: "279 Main St • Suite 110 • Frisco",
      sub: "Same coaches. Same people. A lot more room.",
      images: ["/images/renderings/2026-08-01-new-gym-floor-rendering.jpg",
               "/images/renderings/2026-08-01-recovery-room-rendering.jpg"],
      footer: "brand",
      skull: "off"
    }
  ]
};
