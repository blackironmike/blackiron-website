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
  version: "2026-11-22.2",

  timezone: "America/Chicago",
  defaultSeconds: 10,

  // A live clock in the same spot on every panel, always Frisco time.
  //   "corner"  top right, mirroring the anvil in the bottom-right corner
  //   "footer"  bottom center, on the footer line
  //   "tab"     big, hanging from the top bar at top right
  //   "off"     no clock
  // Try one on /tv/preview with the Clock buttons, or /tv?clock=tab.
  clock: "corner",

  /* ----------------------------------------------------------------------
     THE CYCLE
     Week dates come from `start`. You type labels, not dates.
     phase: intro | test | build | deload drive the phase colors.
     Rally Point uses "rally", which draws every week in Forge.
     ---------------------------------------------------------------------- */
  cycle: {
    name: "Rally Point",
    titleLines: ["Rally", "~Point~"],
    tagline: "Eight weeks. Six teams. ~One gym.~",
    start: "2026-11-23",
    end: "2027-01-17",
    lifts: ["Show up", "Bring your people", "Carry your team"],
    weeks: [
      { label: "Week 1", phase: "rally", note: "Kickoff • Friends & Family" },
      { label: "Week 2", phase: "rally" },
      { label: "Week 3", phase: "rally", note: "Toy drop run Sat Dec 12" },
      { label: "Week 4", phase: "rally", note: "Awards night" },
      { label: "Week 5", phase: "rally", note: "Travel • Double active pts" },
      { label: "Week 6", phase: "rally", note: "Last WOD of 2026" },
      { label: "Week 7", phase: "rally" },
      { label: "Week 8", phase: "rally", note: "Finale • Grand opening" }
    ]  },

  /* Shared footers. Panels pick one with footer: "cycle" | "brand" | "chips". */
  footers: {
    chips: ["Veteran-owned", "Frisco, TX", "Est. 2013"],
    cycle: "Eight weeks. Six teams. ~One gym.~",
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
      id: "timeline", type: "timeline", seconds: 10, cycle: true,
      eyebrow: "The road to January",
      headline: "8 Weeks",
      phases: "Kickoff • Toy Drop • Awards Night • Travel • New Year • Finale",
      note: ["Every class earns points for your team.",
             "Champions crowned January 17."]
    },

    {
      id: "rally-points", type: "spotlight", seconds: 10, cycle: true,
      chip: "How to score",
      title: ["Six teams.", "*One gym.*"],
      dateLine: "November 23 • January 17",
      sub: "Every point goes to your team.",
      cards: [
        { title: "Show up",          text: "2 points a class. It counts from your check-in." },
        { title: "Bring a guest",    text: "5 points. Your invite link gets them set up." },
        { title: "Drop off a toy",   text: "10 points. Toys for Tots, at the front desk." }
      ],
      footer: "cycle",
      skull: "off"
    },

    {
      id: "rally-join", type: "qr", seconds: 9, cycle: true,
      title: ["Your team", "*is waiting.*"],
      list: ["Scan and sign in with your membership email",
             "Add your photo and why you train",
             "Meet your team and your coach"],
      qr: { src: "/images/tv/qr-rallypoint.svg", label: "Join Rally Point", above: true,
            caption: "blackironathletics.com/rallypoint",
            url: "https://www.blackironathletics.com/rallypoint" },
      footer: "cycle"
    },

    {
      // The live Rally Point standings, straight from /challenge/tv. It
      // refreshes itself, so this panel is always current.
      id: "leaderboard", type: "embed", seconds: 28, cycle: true, skull: "off",
      src: "/challenge/tv", label: "Rally Point leaderboard"
    },

    {
      id: "grand-opening", type: "spotlight", seconds: 10, until: "2027-01-16",
      cycleLabel: false, skull: "off",
      chip: "Grand opening",
      starts: { date: "2027-01-16", time: "09:30" },
      countLabel: "Until the doors open",
      title: ["The new Black Iron.", "*Grand opening.*"],
      dateLine: "Saturday • January 16 • 9:30 AM",
      sub: "279 Main St • Suite 110 • Right next door.",
      images: ["/images/renderings/2026-08-01-new-gym-floor-rendering.jpg",
               "/images/renderings/2026-08-01-recovery-room-rendering.jpg"],
      footer: "brand"
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
      list: ["Book a free consultation", "Sign the waiver", "New here? Start here",
             "Leave us a Google review", "Class schedule and more"],
      qr: { src: "/images/tv/qr-links.svg", label: "Scan me", above: true,
            caption: "blackironathletics.com/links",
            url: "https://www.blackironathletics.com/links" },
      footer: "brand"
    }
  ]
};
