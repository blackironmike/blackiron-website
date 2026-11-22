/* Challenge app settings. Everything here is public by design: the Supabase
   publishable key and the Google client ID are meant to ship to the browser.
   Access is enforced by row level security in the black-iron database. */
window.BIA_CHALLENGE = {
  supabaseUrl: 'https://zlqhllywjuphjfcokjrw.supabase.co',
  supabaseKey: 'sb_publishable_7syHNQKK9fNxqBIYEmfuXA_oVohRpVF',
  googleClientId: '879363117851-b19nfqdko1n87k9q26ipeuq8g837eh0k.apps.googleusercontent.com',
  // Google only allows its button on these hosts (set in Google Cloud).
  googleHosts: ['blackironathletics.com', 'www.blackironathletics.com'],
  siteUrl: 'https://www.blackironathletics.com',
  waiverUrl: 'https://app.wodify.com/Token/SignWaiver?WaiverToken=A5D02840253D598F0BBD91DFF0DD47ABF87D4B6FDFF5AE4CD4DB7D18822BA558',
  // Days the Schedule tab greets by name. Classes and Open Gym hours still come from Wodify.
  holidays: { '2026-11-26': 'Happy Thanksgiving' },
  classTimes: ['5:15 AM', '6:15 AM', '8:30 AM', '9:30 AM', '12:00 PM', '4:30 PM', '5:30 PM', '6:30 PM', 'It varies'],
  // Friends & Family Week, Nov 23 to 28, 2026. Strength & Conditioning classes.
  // bookUrl is the Wodify free trial schedule. A guest books a class there, which
  // creates their profile and has them sign the waiver. Free trials are only on for
  // this week, so after `to` the pages go back to the plain waiver link above.
  guestWeek: {
    from: '2026-11-23', to: '2026-11-28',
    bookUrl: 'https://blackiron.wodify.com/OnlineSalesPage/Main?q=Classes%7cOnlineMembershipId%3d235167%26LocationId%3d10409%26ProgramId%3d106946%26IsToViewScheduleOnly%3dTrue',
    days: [
      ['Mon, Nov 23', '5:15 AM · 6:15 AM · 9:30 AM · 12:00 PM · 4:30 PM · 5:30 PM · 6:30 PM'],
      ['Tue, Nov 24', '5:15 AM · 6:15 AM · 9:30 AM · 12:00 PM · 4:30 PM · 5:30 PM'],
      ['Wed, Nov 25', '8:30 AM · 9:30 AM · 12:00 PM · 4:30 PM'],
      ['Thu, Nov 26', 'No classes. Open Gym is open all day.'],
      ['Fri, Nov 27', '8:30 AM · 9:30 AM'],
      ['Sat, Nov 28', '9:30 AM']
    ]
  }
};
