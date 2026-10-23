// Which apps count as doomscrolling: screen time, the boss's healing and the Web Focus guard all use this.
// Pure (screentime.ts loads the native module), so logic-test checks it.

/**
 * Social and short-video apps, by exact package name. Substrings were too greedy: "youtube" caught YouTube
 * Music and "facebook" caught Messenger. The native guard matches with `contains`, so a "Lite" or "Go" variant
 * of these packages counts too.
 */
export const DOOMSCROLL = [
  'com.zhiliaoapp.musically', // TikTok
  'com.ss.android.ugc.trill', // TikTok (some regions)
  'com.instagram.android',
  'com.instagram.lite',
  'com.instagram.barcelona', // Threads
  'com.facebook.katana',
  'com.facebook.lite',
  'com.twitter.android', // X
  'com.reddit.frontpage',
  'com.snapchat.android',
  'com.google.android.youtube',
  'com.pinterest',
  'com.tumblr',
  'com.ninegag.android.app',
];

/** A package that is one of these apps, or a variant of one ("com.zhiliaoapp.musically.go"). */
export const isDoomscroll = (pkg: string) => {
  const p = pkg.toLowerCase();
  return DOOMSCROLL.some((k) => p === k || p.startsWith(`${k}.`));
};
