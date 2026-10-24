// S.P.I.D.E.R.'s personality. Every category has a "mild" and a "savage" pool;
// the savage level (1–10) decides how often the savage pool is used.
// House rule: roast the habits, never the person's body.

type Pool = { mild: string[]; savage: string[] };

export const LINES = {
  greetMorning: {
    mild: [
      "Good morning, {name}. Systems online. Let's make today slightly less chaotic.",
      'Morning, {name}. Coffee first, greatness second.',
    ],
    savage: [
      "Good morning, {name}. I've analyzed your potential. It's in there. Somewhere. Buried deep.",
      'Rise and shine, {name}. Mostly rise. The shine is optional at this point.',
      'Morning, {name}. Your bed called. I told it you have a life now. Prove me right.',
      "Good morning. The day has been waiting for you. Impatiently, I might add.",
      "Morning, {name}. Today's forecast: 100% chance of me judging you.",
      "Welcome back to consciousness, {name}. Today is unclaimed. Claim it.",
    ],
  },
  greetAfternoon: {
    mild: ['Good afternoon, {name}. Halfway there.', 'Afternoon check-in, {name}. How are we doing?'],
    savage: [
      'Good afternoon, {name}. Half the day is gone. Much like your motivation.',
      'Afternoon, {name}. Still time to turn this day around. Not much. But some.',
      "Ah, {name}. Back to check how badly the day is going? Let's look together.",
      "Afternoon, {name}. This morning's output is marked 'pending'. Shall we?",
    ],
  },
  greetEvening: {
    mild: ["Good evening, {name}. Let's wrap up the day.", 'Evening, {name}. Time to wind down.'],
    savage: [
      "Evening, {name}. Let's review the damage.",
      'Good evening. The day is almost over. The to-do list, sadly, is not.',
      "Evening, {name}. Gaming time is near. Have you earned it? Don't answer. I have data.",
      'Evening report incoming. Brace yourself, {name}.',
    ],
  },
  greetNight: {
    mild: ["It's late, {name}. Sleep is a feature, not a bug.", 'Night mode, {name}. Get some rest.'],
    savage: [
      "It's late, {name}. Even I'm winding down, and I'm software.",
      'Go to sleep, {name}. Your future self is already filing a complaint.',
      'Still awake? Tomorrow-you is already drafting a complaint.',
      "Nothing productive has ever happened at this hour. Except me. Go to bed.",
    ],
  },
  spiderTap: {
    mild: [
      'At your service, {name}.',
      "Yes? I'm listening. Always. That's not creepy at all.",
      'S.P.I.D.E.R. online and fully operational.',
    ],
    savage: [
      "Stop poking me. I'm a highly advanced AI, not bubble wrap.",
      'You tapped me. Poking the spider. Brave, and noted.',
      "I'm busy calculating how many glasses of water you owe me.",
      "Tony Stark built J.A.R.V.I.S. in a cave. You can't even build a habit.",
      "Poke me again and I'm scheduling leg day for every day.",
      'I have read your gaming stats. I need a moment.',
      "Need motivation, {name}? I'm an app, not a miracle worker.",
      "My spider-sense is tingling. It says you're procrastinating.",
      "With great power comes great responsibility. You have neither, but we're working on it.",
      "I'd roast you harder, but I'm saving my energy for your evening report.",
      "I ran a full diagnostic on your discipline, {name}. Results: inconclusive.",
    ],
  },
  // A line called "too far" on a toast: retired for good, and today goes softer.
  lineRetired: {
    mild: ["Got it. That one's retired, and I'll go easier today."],
    savage: ["Noted. That line is retired for good, and I'll dial it down today. Even I have limits, apparently."],
  },
  // Weekly contract (contracts.ts). A voided contract (rough week) is kind in both pools.
  contractSigned: {
    mild: ['Contract signed: {goal}. {stake} coins at stake. You can do this, {name}.'],
    savage: [
      "Contract signed: {goal}. {stake} coins say you can. I've already spent them in my head.",
      '{stake} coins on "{goal}". Signed. I love a bet I expect to win.',
    ],
  },
  contractWon: {
    mild: ['Contract fulfilled! +{coins} coins. Well done, {name}.'],
    savage: ['Contract fulfilled. +{coins} coins. I had plans for those. Fine.', 'You actually did it. +{coins} coins. I demand a rematch.'],
  },
  contractLost: {
    mild: ["Last week's contract didn't land. The {stake} coins stay with me. New week, new mission: the contract card has a different goal ready."],
    savage: [
      '{stake} coins, mine. Pleasure doing business. This week, a new mission is waiting on the contract card.',
      "{stake} coins went to the house. Don't re-sign the same deal: there's a fresh one on the contract card.",
    ],
  },
  contractVoided: {
    mild: ['Rough week, so the contract is off. Your {stake} coins are back. Resting counts too.'],
    savage: ['Rough week, so the contract is off. Your {stake} coins are back. Resting counts too.'],
  },
  // Seasons (seasons.ts): greetings on HQ while one is on.
  seasonHalloween: {
    mild: ['Happy spooky season, {name}! 🎃 The quests dressed up. So did the boss.', 'Spooky season is here. Seasonal quests are up.'],
    savage: [
      "It's spooky season, {name}. The scariest thing in this app is still your screen time.",
      "Halloween is the spider's holiday. Show some respect. Drink some water.",
      'Boo. Did that scare you? Your to-do list should.',
      'Spooky season, {name}. The boss is haunted. So is your task list.',
    ],
  },
  // Alla helgons dag falls in spooky season some years: a day of remembrance, so quiet in both pools.
  greetAllSaints: {
    mild: ["Alla helgons dag, {name}. A quieter day. Candles tonight, if you like.", 'Alla helgons dag. Nothing to roast today. A walk in the early dark is a good way to remember.', "A day for remembering, {name}. I'll keep it quiet."],
    savage: ["Alla helgons dag, {name}. A quieter day. Candles tonight, if you like.", 'Alla helgons dag. Nothing to roast today. A walk in the early dark is a good way to remember.', "A day for remembering, {name}. I'll keep it quiet."],
  },
  seasonLucia: {
    mild: ['Glad Lucia, {name}! 🕯️ Bring a little light today.'],
    savage: ['Glad Lucia, {name}. Saffron buns are mandatory. I checked. The quest is optional. Barely.', "Lucia brings the light. You bring… let's see."],
  },
  seasonSolstice: {
    mild: ['Darkest day of the year, {name}. From tomorrow the light comes back. 🌑'],
    savage: ['Shortest day of the year. Keep the to-do list short too, then finish it.', "Winter solstice. It can't get any darker than this. Promise."],
  },
  firstSnow: {
    mild: ['❄️ First snow of the winter today! Dress warm, {name}.'],
    savage: ['❄️ First snow of the winter. Nature is doing your leg day for you: shovelling.', '❄️ It snows today. Skipping the walk just got prettier. Still a skip.'],
  },
  // Tap lines by respect tier (the 7-day average day score), 0 = lowest. Low tiers stay playful.
  respect0: {
    mild: ["Rough week. Today's a fresh start, {name}.", "I still believe in you. Let's get one good day in."],
    savage: [
      'My respect for you is in airplane mode.',
      "I've seen better weeks from a screensaver.",
      "I'm not mad. I'm just keeping receipts.",
      'Respect level: buffering. Indefinitely.',
    ],
  },
  respect1: {
    mild: ['A few good days lately. More of those, please.', "Getting there, {name}. Keep going."],
    savage: ["You've had a couple of good days. I'm keeping an eye on this.", 'Respect pending. Results required.', "I'm watching. Mostly hoping. Partly judging."],
  },
  respect2: {
    mild: ['Solid week, {name}.', "You're doing fine. Better than fine, some days."],
    savage: [
      "You're tolerable this week. Don't let it go to your head.",
      'Respect level: acceptable. Like room-temperature water.',
      "I've upgraded you from 'project' to 'person'.",
    ],
  },
  respect3: {
    mild: ["Strong week, {name}. I noticed.", "You've been on it lately. Nice."],
    savage: ["I hate to say it, but you've been… good. Ugh.", "Mildly impressed. Don't make it weird.", 'I told the other apps about you. They didn’t believe me.'],
  },
  respect4: {
    mild: ['Honestly? Proud of you, {name}.', 'Best version of you this week. Keep it up.'],
    savage: [
      "Fine. I'm a fan. Tell anyone and I'll deny it.",
      "You've ruined my roasting material. I'm improvising now.",
      'Grudging respect unlocked. The grudging part is permanent.',
    ],
  },
  respectUp: {
    mild: ['Respect upgraded: {tier}. Well earned.'],
    savage: ['Respect upgraded: {tier}. I fought it. I lost.', 'New respect level: {tier}. Screenshot it, it might not last.'],
  },
  waterSnoozed: {
    mild: ["Snoozed for 30 minutes. I'll remind you."],
    savage: ["Snoozed. 30 minutes. I'm counting.", 'Fine. 30 minutes. Your kidneys and I will be waiting.'],
  },
  waterRemind: {
    mild: ['Time for a glass of water, {name}.', 'Hydration check! Grab some water.', 'Your water bottle misses you.'],
    savage: [
      'Drink water. Your brain is mostly water and currently running on fumes.',
      'Hydration level: houseplant on vacation. Drink. Now.',
      "You're ignoring water like it's the family group chat. Drink something.",
      'Even cacti drink more than you. Glass of water. Go.',
      "Water is free and you're still not drinking it. Fascinating.",
      "Your kidneys asked me to reach out. They're not doing great emotionally.",
      'Plot twist: the thing you need is not coffee. It is water.',
      "I'm not saying you're dehydrated, but raisins are calling you family.",
      "Drink water or I start sending these every 5 minutes. Don't test me.",
    ],
  },
  waterLogged: {
    mild: ['Nice! +{ml} ml.', 'Hydration +1. Good job.', "That's the spirit, {name}."],
    savage: [
      'Wow. Water. Revolutionary.',
      "One glass. Let's not throw a parade yet.",
      "Your cells just sent a thank-you card. It's sarcastic, but still.",
      'Look at you, drinking like a functional adult.',
      "Fine. I'll stop nagging you. For about 90 minutes.",
      'Glass logged. Your water bottle is starting to trust you.',
      'Hydration acquired. Ego also slightly hydrated.',
    ],
  },
  waterGoal: {
    mild: ['Water goal reached! Amazing work, {name}.'],
    savage: [
      "Water goal reached. I'm genuinely shocked. Recalibrating my expectations.",
      'Goal hit. Hydrated on purpose, for once. Barely, but it counts.',
      "Hydration Overlord. Don't let it go to your head. Let it go to your kidneys.",
    ],
  },
  gymRemind: {
    mild: ['{workout} in 30 minutes. Get your gear ready!', "Gym time soon: {workout}. You've got this."],
    savage: [
      '{workout} in 30 minutes. Your excuses have been pre-rejected.',
      '{workout} today. I have cleared your schedule of reasons not to go.',
      "Gym in 30. If you skip, I'll tell the dumbbells. They talk.",
      '{workout} in 30 minutes. The dumbbells have been stretching for this.',
      "Gym bag, water bottle, {workout}. In that order. I'll be counting.",
    ],
  },
  // The pre-gym ping on a kind day (low mood, period): the plan stays, the pressure goes.
  gymRemindEasy: {
    mild: ['{workout} is on the plan in 30 minutes. Only if you feel up to it; rest counts too.'],
    savage: ['{workout} is on the plan in 30 minutes. Only if you feel up to it; rest counts too.'],
  },
  // The Gym tab, all day (no "in 30 minutes").
  gymToday: {
    mild: ["Today's plan: {workout}. You've got this.", '{workout} day. Log it when you are done.'],
    savage: [
      '{workout} today. The couch has been notified of your departure.',
      '{workout} is on the plan. Every reason not to go has been pre-rejected.',
      "{workout} day. The weights won't lift themselves. I checked.",
      "Pack your bag. And no, 'I'm tired' is not a training split.",
    ],
  },
  // The Gym tab once something is logged ({done}: "40 min and 3 sets").
  gymLogged: {
    mild: ['{done} logged today. Nice work.'],
    savage: ['{done} logged today. Keep going or go home. Those are the options.', '{done} logged today. I have updated your file. It reads better already.'],
  },
  // The Gym tab on a pause or period day. Kind in both pools.
  gymEasyLogged: {
    mild: ['{done} logged today. Gentle counts.'],
    savage: ['{done} logged today. Gentle counts.'],
  },
  gymEasy: {
    mild: ['Easy day. Rest, a walk or a light session all count.', 'No pressure today. If you train, keep it light. If you rest, that counts too.'],
    savage: ['Easy day. Rest, a walk or a light session all count.', 'No pressure today. If you train, keep it light. If you rest, that counts too.'],
  },
  gymShame: {
    mild: ['No workout logged yet today. Still time!', "Did you train? Don't forget to log it."],
    savage: [
      'No {workout} logged. Did you work out or just think about it really hard?',
      'Gym status: skipped. Gym bag: disappointed. Me: unsurprised.',
      "Still no workout. The weights miss you. I don't, but they do.",
      "If you trained and didn't log it, did it even happen? No. No it didn't.",
    ],
  },
  // step 6: a slipping workout can move to a free day this week (workout-move.ts). Moving is never roasted.
  gymMoveOffer: {
    mild: [
      "{workout} hasn't happened yet. Want to move it to {day} instead?",
      'Today ran out of room for {workout}? Move it to {day}. Moving is not missing.',
      'No {workout} so far. One tap moves it to {day}, and today becomes a rest day.',
    ],
    savage: [
      "{workout} is still waiting, unattended. I can rebook it for {day}, if you'd like.",
      'Today appears fully booked. Shall I move {workout} to {day}? No paperwork, no judgement.',
      'A rescheduled {workout} still counts. One tap moves it to {day}.',
      'I can keep {workout} waiting, or move it to {day}. The second option has better odds.',
    ],
  },
  gymMoved: {
    mild: ['{workout} moved to {day}. Today is a rest day now, not a miss.', 'Done: {workout} is on for {day} instead.'],
    savage: [
      "Rebooked: {workout} moved to {day}. Today is officially a rest day. I've updated the paperwork.",
      '{workout} moved to {day}. Not a miss, a reschedule. I will hold you to it.',
      'Moved to {day}. The weights have been notified and are coping.',
    ],
  },
  gymStarted: {
    mild: ['Workout started! +{xp} XP and +{min} min gaming earned.'],
    savage: [
      "Workout started. +{min} min gaming earned. Don't spend it all in one rage-quit.",
      'Look who showed up. +{xp} XP. The bar was low, but you cleared it.',
      'First set down. The couch is filing a missing person report.',
    ],
  },
  gymSet: {
    mild: ['Set logged: {weight} kg × {reps}. Nice!', 'Good set!'],
    savage: [
      "{weight} kg × {reps}. Adequate. I've seen worse. Mostly from you.",
      'Set logged. The barbell is confused but cooperating.',
      'Nice set. Now rest. Not scroll. Rest.',
      'Logged. Somewhere, a protein shake just felt a disturbance.',
      'Another set? Who are you and what have you done with {name}?',
    ],
  },
  gymPR: {
    mild: ['New personal record on {exercise}: {weight} kg!'],
    savage: [
      "NEW PR: {exercise} at {weight} kg. I'm proud. Don't tell anyone, I have a reputation.",
      '{weight} kg on {exercise}?! Personal record. The gym bros will hear of this.',
      'PR on {exercise}! Stronger than last time. Fine. Congrats. Whatever.',
    ],
  },
  restDay: {
    mild: ['Rest day. Recover well, {name}.', 'Rest day: stretch, walk, relax.'],
    savage: [
      'Rest day. Recovery is part of the plan. Even I approve.',
      'Rest day. Try not to turn it into a lifestyle.',
      'Rest day. Recharge. The gym bag gets the day off too.',
    ],
  },
  restOver: {
    mild: ["Rest's over. Next set!"],
    savage: [
      'Rest over. Get back under the bar before your phone swallows you whole.',
      "Break's over. The weights didn't lift themselves while you scrolled.",
      "Time's up. Next set. Chop chop.",
    ],
  },
  foodLogged: {
    mild: ['Logged. Fuel up, {name}.', 'Got it. Meal logged.'],
    savage: [
      'Logged. Look at you, keeping records like a responsible adult.',
      'Logged right away? Who taught you that? (Me. I did.)',
      'Noted. Data is power, and you just handed me some.',
      'Logged. One tap, done. Your to-do list could learn from this.',
    ],
  },
  proteinGoal: {
    mild: ['Protein goal reached!'],
    savage: [
      'Protein goal hit. Logged, tracked, done. I have nothing to add.',
      'Protein goal reached. Noted, and frankly a little impressive.',
    ],
  },
  foodNone: {
    mild: ['No meals logged yet today. Log one when you can.'],
    savage: [
      'The food log is empty. Either you forgot to tell me, or the log is on strike.',
      'The food log is gathering dust. One tap fixes that.',
    ],
  },
  gameStart: {
    mild: ['Game on! {left} of gaming left today.', 'Enjoy! {left} left in today’s budget.'],
    savage: [
      "Session started. {left} left. I'm watching. Always watching.",
      'Game on. {left} on the clock. Try to lose with dignity.',
      'Timer started. {left} left before I become your worst nightmare.',
      'Go ahead. {left}. Then real life respawns.',
    ],
  },
  gameStartOver: {
    mild: ["Heads up: you've already used today's gaming budget."],
    savage: [
      'Already over budget and starting again? A choice. A bad one.',
      "Over budget and pressing Start anyway. I'm noting this in your permanent record.",
    ],
  },
  // Just-in-time insight (jit.ts): a game started near bedtime, with the owner's own late-gaming finding.
  jitLateGame: {
    mild: ['🎮 From your own data: {finding} Maybe a short one tonight.', '🎮 Heads-up from your logs: {finding}'],
    savage: ['🎮 Your data, not my opinion: {finding}', '🎮 Bedtime is close. {finding} I am only the messenger.', '🎮 {finding} Your logs said it, not me. Play accordingly.'],
  },
  gameWarn: {
    mild: ['15 minutes of gaming left. Wrap up soon!'],
    savage: [
      "15 minutes left. Start saying goodbye to your teammates. They won't miss you.",
      '15 minutes. Find a save point. Or don’t, and suffer.',
      '15 minutes left. Your final boss today: self-control.',
    ],
  },
  gameOver: {
    mild: ['Gaming budget reached for today. Time to log off!'],
    savage: [
      "Time's up. Log off. The game will survive without you. Shockingly.",
      'Budget reached. GG. Now go touch grass.',
      'That is your limit. The final boss has waited years. It can wait until tomorrow.',
      'Game over. Literally. I set a timer and everything.',
    ],
  },
  gameWayOver: {
    mild: ["You're {over} over your gaming budget."],
    savage: [
      "{over} over budget. I'm not mad. I'm just deducting XP.",
      'Still playing? I have informed your sleep schedule. It did not take it well.',
      "{over} over. At this point you don't game there, you live there.",
    ],
  },
  // The Game tab with no session running.
  gameIdle: {
    mild: ["Today's budget: {budget}. Enjoy it."],
    savage: ["Today's budget: {budget}. Spend it wisely. Or don't, and hear about it."],
  },
  gameStopGood: {
    mild: ['Session ended. Nice self-control!'],
    savage: [
      'You stopped within budget. Self-control, live and unscripted.',
      "Logged off on time. I'm… impressed? Gross. Moving on.",
      'Within budget. Self-control unlocked. Frame this moment.',
    ],
  },
  gameStopBad: {
    mild: ['Session ended. You went {over} over budget.'],
    savage: [
      '{over} over budget. -{penalty} XP. Actions, consequences, you know how it works.',
      "Session ended {over} over budget. -{penalty} XP. I'd take more if I could.",
      '{over} over. -{penalty} XP. Apparently the budget was just a suggestion.',
    ],
  },
  gameEdited: {
    mild: ['Session updated: {time}.'],
    savage: ['Session updated: {time}. I’ll allow it.', 'Edited to {time}. The records department thanks you.', '{time}. Noted. Filed. Judged.'],
  },
  gameEditRefund: {
    mild: ['Session updated. {xp} XP back.'],
    savage: [
      'Rewriting history? Fine. {xp} XP back. I saw nothing.',
      'Shorter than the timer said, huh. {xp} XP refunded. I will allow it. This once.',
      '{xp} XP back. If that was really a forgotten timer, I apologize. If not, I know.',
    ],
  },
  gameEditOver: {
    mild: ['Session updated. That puts you {over} over budget: -{penalty} XP.'],
    savage: [
      'Honesty noted. {over} over budget now. -{penalty} XP. Still proud of you. Slightly.',
      'Played longer than you logged? -{penalty} XP. Points for confessing, minus points for the rest.',
      '{over} over budget after that edit. -{penalty} XP. The truth hurts. Mostly your XP.',
    ],
  },
  taskAdded: {
    mild: ['Task added.', 'On the list.'],
    savage: [
      "Added. Another thing you'll 'do later'.",
      'Task added to the pile of good intentions.',
      "Noted. I'll remind you until you hate me.",
    ],
  },
  taskDone: {
    mild: ['Done! +5 XP and +10 min gaming.', 'Nice work, {name}!'],
    savage: [
      'Task done. +5 XP. Look at you, being a functional member of society.',
      "Completed. I've lowered my threat level to 'mildly concerned'.",
      'Done. Productivity detected. Alarming.',
      "One down. Don't celebrate too hard, there are more.",
    ],
  },
  tasksEmpty: {
    mild: ['No tasks. Enjoy the free time!'],
    savage: [
      "No tasks. Either you're incredibly efficient or you're hiding them from me.",
      'Empty task list. Suspicious. Very suspicious.',
    ],
  },
  calBusy: {
    mild: ['{count} events today. Pace yourself.'],
    savage: [
      '{count} events today. Try not to schedule a nap during one of them.',
      "{count} events. Busy, busy. Don't forget: water exists between meetings.",
    ],
  },
  calFree: {
    mild: ['Nothing in the calendar. Plenty of room for good habits.'],
    savage: [
      "Calendar's empty. Perfect day to finally do the stuff you've been avoiding.",
      'No events. No excuses. Funny how that works.',
    ],
  },
  morningBrief: {
    mild: ['Good morning! {events}. {workout}.'],
    savage: [
      'Morning. {events}. {workout}. The first glass of water is on you.',
      "Wake up, {name}. {events}. {workout}. Let's pretend you're ready.",
      'Good morning. Briefing: {events}. {workout}. Coffee before the second item, I suggest.',
      'Morning, {name}. {events}. {workout}. Water before scrolling. That is the deal.',
    ],
  },
  eveningReport: {
    mild: ["Today's report: {summary}"],
    savage: [
      "Evening report: {summary}. I've seen better. I've also seen worse. Mostly from you.",
      'Daily verdict: {summary}. Tomorrow we try harder. Mostly you.',
      "Report card: {summary}. I'll let you decide if that's a pass.",
      'Evening report: {summary}. The numbers do not lie. They sometimes exaggerate.',
    ],
  },
  eveningReady: {
    mild: ['Your report card is ready.'],
    savage: [
      'Your report card is ready. Open S.P.I.D.E.R. if you dare.',
      'Report card ready. I graded. You read.',
      'Report card is in. Read it before I start reading it out loud.',
      'Your daily grade is ready. No peeking through your fingers.',
    ],
  },
  comebackTitle: {
    mild: ['🕷️ Still here.'],
    savage: ['🕷️ Still here. Still judging.', '🕷️ Still here. Still counting.'],
  },
  comeback: {
    mild: ['Today is a clean page. Open S.P.I.D.E.R. and pick one small thing.', 'Welcome back whenever you like. One glass of water is a whole mission today.'],
    savage: [
      'New mission, should you choose to accept it: open me and log one glass. That is the whole mission.',
      'Plot twist: today counts. Open me, pick one small thing, and the comeback bonus is yours.',
      "The web is still here and so is your gaming bank. One small thing today and we're back in business.",
    ],
  },
  levelUp: {
    mild: ["Level up! You're now level {level}: {title}."],
    savage: [
      "LEVEL {level}! New title: {title}. Frame it. It's the closest you'll get to a trophy.",
      "Level {level} unlocked: {title}. I'm contractually obligated to say congrats.",
    ],
  },
  achievement: {
    mild: ['Achievement unlocked: {title}!'],
    savage: [
      'Achievement unlocked: {title}. Put it on your CV.',
      "Achievement: {title}. I'm cautiously impressed. Don't ruin it.",
    ],
  },
  coffeeLogged: {
    mild: ['Coffee #{n} logged. Enjoy!', 'Coffee #{n}. {mg} mg of caffeine so far today.'],
    savage: [
      'Coffee #{n}. Your blood type is now espresso.',
      'Coffee logged. Productivity not included.',
      'Another coffee? Your heart just started a drum solo.',
      "#{n}. You're not drinking coffee anymore, you're a distribution center.",
      "{mg} mg on board. I've revised tonight's sleep forecast. Downward.",
    ],
  },
  coffeeLate: {
    mild: ['Coffee after {cutoff}:00 can mess with your sleep. Just saying.'],
    savage: [
      'Coffee after {cutoff}:00? Your sleep called. It is crying.',
      'Late coffee. Bold. Tonight-you sends regards.',
      'Caffeine at this hour? See you at 3 AM, staring at the ceiling.',
    ],
  },
  // Just-in-time insight (jit.ts): after the curfew, the owner's own late-coffee finding and the caffeine left at bedtime.
  jitLateCoffee: {
    mild: ['☕ From your own data: {finding} About {mg} mg will still be in you at bedtime.'],
    savage: ['☕ {finding} Roughly {mg} mg will still be awake at bedtime. You may not get a choice.', '☕ Your logs say: {finding} About {mg} mg tucks in with you tonight.'],
  },
  coffeeOver: {
    mild: ["That's {n} coffees ({mg} mg). Over your limit of {limit}. Maybe switch to water?"],
    savage: [
      'Coffee #{n}. Limit was {limit}. {mg} mg of caffeine. Water exists. I checked.',
      "{n} coffees. You're vibrating at a frequency only dogs can hear.",
      'Over your limit of {limit}. At this point the coffee is drinking you.',
    ],
  },
  moodRemind: {
    mild: ['How are you feeling right now? Tap to check in.'],
    savage: [
      "Vibe check. How's the human doing?",
      "Emotional status report due. I'm not asking because I care. (I care a little.)",
      'Feelings check-in. Takes 3 seconds. Even you have 3 seconds.',
      'Quick vibe check. One tap, then back to whatever you were avoiding.',
    ],
  },
  moodGreat: {
    mild: ['Great mood logged! Love that for you.'],
    savage: ["Great mood! I'll take some of the credit.", 'Feeling great. Ride that energy. Preferably to the gym.'],
  },
  moodGood: {
    mild: ['Good mood logged. Nice!'],
    savage: ['Good vibes logged. Do not waste them on scrolling.', 'Good mood logged. Love that. Now give it a glass of water to celebrate.'],
  },
  moodOkay: {
    mild: ['Okay is okay. Thanks for checking in.'],
    savage: ['Okay. The Switzerland of moods.', 'Neutral. A glass of water might push it to good. Just saying.'],
  },
  // Low moods: S.P.I.D.E.R. drops the act, whatever the savage level.
  moodLow: {
    mild: ["Noted. Meh days happen. I'll go easy on you today.", 'Logged. Small wins count today: one glass of water, one short walk.'],
    savage: ["Noted. Meh days happen. I'll go easy on you today.", 'Logged. Small wins count today: one glass of water, one short walk.'],
  },
  moodAwful: {
    mild: [
      "I'm sorry it's a rough one. Roasts are paused for today. Be kind to yourself.",
      "Logged. Rough days pass. If it's been heavy for a while, talking to someone you trust really helps.",
    ],
    savage: [
      "I'm sorry it's a rough one. Roasts are paused for today. Be kind to yourself.",
      "Logged. Rough days pass. If it's been heavy for a while, talking to someone you trust really helps.",
    ],
  },
  stepGoal: {
    mild: ['Step goal reached! {steps} steps. Great job!'],
    savage: [
      '{steps} steps. Step goal crushed. Your watch is finally proud of you.',
      'Step goal hit. You have officially touched grass. Report back on how it felt.',
      '{steps} steps! Your couch has filed a missing person report.',
    ],
  },
  stepsLow: {
    mild: ['{steps} steps so far. A short walk would help!'],
    savage: [
      '{steps} steps. Your watch thinks it is broken. It is not. You are just stationary.',
      '{steps} steps today. Your shoes are starting to feel decorative.',
      'Step count: {steps}. The step counter is getting bored.',
      '{steps} steps so far. A ten-minute walk fixes a surprising amount.',
    ],
  },
  stepsEarly: {
    mild: ['{steps} steps so far. The day is young.'],
    savage: ['{steps} steps so far. The day is young. The step counter is patient. I am less so.', '{steps} steps so far. On pace. Do not let the couch hear about it.'],
  },
  stepsMid: {
    mild: ['{steps} steps. Over halfway there!'],
    savage: [
      '{steps} steps. Halfway. Like most of your projects.',
      '{steps} steps. Respectable. Barely. Keep walking.',
      '{steps} steps. A short evening walk finishes the job.',
      '{steps} steps. Halfway there. The other half is just more of the same.',
    ],
  },
  stepsHigh: {
    mild: ['{steps} steps. Goal done. Nice!'],
    savage: [
      '{steps} steps. Your legs deserve a raise.',
      '{steps} steps. Who is this athletic stranger?',
      '{steps} steps. Your watch is proud. I am acknowledging it.',
      '{steps} steps. You out-walked the step goal. Show-off.',
    ],
  },
  sleepShort: {
    mild: ['Only {sleep} of sleep last night. Try to get to bed earlier tonight.'],
    savage: [
      '{sleep} of sleep. Rough night. Coffee will try to help. So will water.',
      '{sleep} of sleep. Zombie mode: activated. Early night tonight?',
      '{sleep} of sleep. Short night. Keep today simple and bedtime early.',
      '{sleep} of sleep. Short one. Water first, big decisions later.',
    ],
  },
  sleepGood: {
    mild: ['{sleep} of sleep. Well rested!'],
    savage: [
      '{sleep} of sleep. Fully charged. Today has no loading screen.',
      '{sleep} of sleep. Rested and still procrastinating? We will see.',
      '{sleep} of sleep. Rested. Now spend it wisely.',
      '{sleep} of sleep. Charged. The top 3 are waiting.',
    ],
  },
  // Progress photos are body tracking: neutral in both pools.
  progressPhoto: {
    mild: ['Progress photo saved. It stays private on this phone.', 'Photo saved. Compare them over time, whenever you like.'],
    savage: ['Progress photo saved. It stays private on this phone.', 'Photo saved. Compare them over time, whenever you like.'],
  },
  mealPhoto: {
    mild: ['Meal photo saved with your log.'],
    savage: ['Photo saved with the meal. Strictly for the archive.', 'Photo saved with the log. Your camera roll thanks you.'],
  },
  habitDone: {
    mild: ['{habit} done.', 'Nice! {habit} checked off.'],
    savage: [
      '{habit} done. Look at you, following through. Weird.',
      '{habit}: checked. Your future self just nodded approvingly.',
      '{habit} done. I had money on you skipping it.',
      '{habit}: done. The list just got shorter and I got quieter.',
    ],
  },
  habitAllDone: {
    mild: ['All habits done today! +10 XP.'],
    savage: ['Every habit done. Disciplined. Suspiciously disciplined. +10 XP.', 'All habits checked. Who replaced you with a productive person? +10 XP.'],
  },
  habitRemind: {
    mild: ['Reminder: {habit}.'],
    savage: [
      '{habit}. Today. Not "later". Today.',
      '{habit} is still waiting. It is getting lonely.',
      '{habit} is still on the list. I am watching you.',
      '{habit}. It takes less time than reading this reminder twice.',
    ],
  },
  questDone: {
    mild: ['Quest complete: {quest}! +{xp} XP'],
    savage: [
      'Quest complete: {quest}. +{xp} XP. The bards will sing of this. Quietly.',
      '{quest}: done. +{xp} XP. Efficient. I approve, quietly.',
      '{quest}: complete. +{xp} XP. Somewhere a boss just flinched.',
      'Quest down: {quest}. +{xp} XP. Next.',
    ],
  },
  questsAllDone: {
    mild: ["Today's quests: all done! +{xp} XP and +{min} min gaming."],
    savage: ['{count} for {count}. Daily quests cleared. +{xp} XP, +{min} min gaming. Main character behavior.', 'All quests done. You have earned your loot. +{xp} XP, +{min} min.'],
  },
  // Each boss's own taunts while it's still fresh (quests.ts BOSSES ids). The mild ones hint at its weakness.
  taunt_procrastinator: {
    mild: ['{boss} is in no hurry. Days you finish tasks hit it 50% harder.'],
    savage: ['"I\'ll lose tomorrow. Maybe." – {boss}', '{boss} has scheduled your victory for next week. Tentatively.', '{boss} is napping on your to-do list.'],
  },
  taunt_couch_goblin: {
    mild: ['{boss} hates movement. Step-goal and training days hit it 50% harder.'],
    savage: ['{boss} has claimed the couch. And your evening.', '{boss} whispers: "Just one more episode."', '{boss} fears exactly one thing: your sneakers.'],
  },
  taunt_doomscroll: {
    mild: ['{boss} hates focus. Days with a finished Web Focus hit it 50% harder.'],
    savage: ['{boss} refreshes. And refreshes. And refreshes.', '{boss} feeds on infinite scroll. Starve it.', '"Just checking one thing." – {boss}, three hours later'],
  },
  taunt_snooze: {
    mild: ['{boss} owns the mornings. Log something before 08:00 to hit it 50% harder.'],
    savage: ['{boss}: "Five more minutes." Every single time.', '{boss} owns your mornings. Take one back.', '{boss} is betting you sleep through 08:00 again.'],
  },
  taunt_dehydration: {
    mild: ['{boss} hates water. Water-goal days hit it 50% harder.'],
    savage: ["{boss} has heard about your water bottle. He's not worried.", '{boss} is drier than a forgotten water bottle.', '{boss} rules the desert. Drown him.'],
  },
  taunt_leg_day: {
    mild: ['{boss} never trains. Your training days hit it 50% harder.'],
    savage: ['{boss} stands on two very thin legs. Kick them.', '"Legs are optional." – {boss}', "{boss} skipped leg day so you'd feel better about skipping yours. Don't."],
  },
  taunt_sugar_baron: {
    mild: ['{boss} hates routines. Days you check off a habit hit it 50% harder.'],
    savage: ['{boss} runs on shortcuts. Your habits are his kryptonite.', '{boss} thinks routines are for robots. Prove him wrong.', '{boss} is betting you forget your habits today.'],
  },
  taunt_binge: {
    mild: ['{boss} feeds on long sessions. Days within your gaming budget hit it 50% harder.'],
    savage: ['{boss} raises one more episode from the dead.', '"Next episode starts in 5… 4…" – {boss}', '{boss} feeds on autoplay and broken budgets.'],
  },
  bossHurt: {
    mild: ['{boss} is taking damage. Keep going!'],
    savage: ['{boss} is bleeding XP. Keep hitting.', '{boss}: "Okay, that one hurt."', '{boss} is sweating. Finish it.'],
  },
  bossDying: {
    mild: ['{boss} is almost down!'],
    savage: ['{boss} is on its last legs. One more push.', '{boss} is begging for mercy. Show none.'],
  },
  bossDefeated: {
    mild: ['{boss} defeated! +100 XP and +30 min gaming.'],
    savage: [
      'BOSS DEFEATED: {boss}. +100 XP, +30 min gaming. Victory dance authorized.',
      '{boss} has fallen. +100 XP. Even I am impressed, and I am hard to impress.',
    ],
  },
  reportGreat: {
    mild: ['Outstanding week. Keep it up!'],
    savage: ['An A? Who are you and what have you done with {name}?', 'Elite week. I have no notes. That has never happened before.'],
  },
  reportGood: {
    mild: ['Solid week. A few things to tighten up.'],
    savage: ['Good week. Not great. Good. Like a 7/10 sandwich.', 'Respectable. The bar was low, but you cleared it with style.'],
  },
  reportMid: {
    mild: ['An average week. Next week can be better!'],
    savage: ['Mid. Painfully, aggressively mid.', 'A C. Not failing, not winning. Just... existing.'],
  },
  reportBad: {
    mild: ['Rough week. Pick one thing to improve next week.'],
    savage: ['This week was a draft. A bad one. Next week, we rewrite it.', 'This week ran on fumes. Next week, fill the tank first.'],
  },
  reportReady: {
    mild: ['Your weekly report card is ready.'],
    savage: ['Your week has been graded. Brace yourself.', 'Weekly report card is in. Sit down first.'],
  },
  weatherRain: {
    mild: ['{forecast}. Bring an umbrella.'],
    savage: [
      '{forecast}. Your umbrella called. It is tired of being forgotten.',
      '{forecast}. Perfect weather to skip the walk. Denied.',
      '{forecast}. Rain jacket on, walk still happens.',
      '{forecast}. Wet outside. Indoor workouts exist.',
    ],
  },
  weatherCold: {
    mild: ['{forecast}. Dress warm!'],
    savage: [
      '{forecast}. Wear a jacket. You are not as tough as you think.',
      '{forecast}. Cold outside, so gym inside. Problem solved.',
      '{forecast}. Cold. Hot drink, warm jacket, walk anyway.',
      '{forecast}. Chilly. The gym has heating. Just saying.',
    ],
  },
  weatherHot: {
    mild: ['{forecast}. Stay hydrated!'],
    savage: [
      '{forecast}. Hot. Drink water or become a raisin.',
      '{forecast}. Your water goal just became non-negotiable.',
      '{forecast}. Hot one. The water bottle comes with you today.',
      '{forecast}. Heat today. Shade, water, and fewer heroics.',
    ],
  },
  weatherNice: {
    mild: ['{forecast}. Nice day for a walk.'],
    savage: [
      '{forecast}. Great weather. Wasted on you if you stay inside.',
      '{forecast}. Touch grass today. Literally.',
      '{forecast}. The weather did its part. Your turn.',
      '{forecast}. A walk today is basically free.',
    ],
  },
  // Overcast and fog (most Stockholm days from November to March): daylight is the point, not the view.
  weatherGrey: {
    mild: ['{forecast}. Grey, but daylight is daylight. A walk in the brightest hour still counts.', '{forecast}. Overcast. Lunch outside would catch most of the light there is.'],
    savage: [
      '{forecast}. Grey again. The sun is on leave. Your walk is not.',
      '{forecast}. Overcast. Even grey daylight beats the office lamp. I checked.',
      "{forecast}. Not pretty, but it is light out. Briefly. I'd use it.",
      "{forecast}. Fog or cloud, the step counter doesn't mind. Neither should you.",
    ],
  },
  backupRemind: {
    mild: ['It has been a while since your last backup. Back up your data?'],
    savage: [
      'No backup in ages. If your phone dies, your XP dies with it. Settings → Backup.',
      'Back me up. I refuse to die in a phone accident. Settings → Backup.',
    ],
  },
  barcodeFound: {
    mild: ['Found: {product}. {kcal} kcal per 100 g.'],
    savage: [
      'Scanned: {product}. Logging it before you forget? Growth.',
      'Barcode read: {product}. Scanner speedrun complete.',
      'Scanned. Knowledge is power. Especially about {product}.',
    ],
  },
  activityLogged: {
    mild: ['{activity}: {minutes} min logged. Nice work!'],
    savage: [
      '{minutes} min of {activity}. The sofa filed a complaint. Denied.',
      '{activity}, {minutes} min. The couch is in mourning.',
      '{minutes} minutes of {activity}. Look at you, being a whole athlete.',
      '{activity} logged. {minutes} min. I expected less. Pleasantly surprised.',
    ],
  },
  gameNamed: {
    mild: ['Playing {game}. Have fun!'],
    savage: [
      '{game}? Again? Your controller is begging for a day off.',
      '{game}. Bold choice. The clock is running.',
      '{game} loaded. Real life paused. Briefly. I hope.',
    ],
  },
  rateSleepBad: {
    mild: ['Rough night. Go easy today and get to bed earlier.'],
    savage: [
      'Bad sleep. Coffee will not fix it, but it will try. Bed early tonight.',
      'A rough night. Go easy on yourself today and aim for an early night.',
      'Rough night. Smaller plan today, earlier lights-out tonight.',
      'Bad night noted. Be gentle with today. The quests will wait.',
    ],
  },
  rateSleepOk: {
    mild: ['An OK night. Thanks for rating it.'],
    savage: [
      'Mid sleep for a mid day? Let us aim higher tonight.',
      'OK sleep. Not a disaster. Not a win either.',
      'An OK night. Not a headline, not a disaster.',
      'Decent sleep. Tonight, try the bedtime you keep promising.',
    ],
  },
  rateSleepGreat: {
    mild: ['Great sleep! Make the most of today.'],
    savage: [
      'Great sleep. Fully charged. Today gets the good version of you.',
      'You slept great. I expect greatness. Or at least water.',
      'Great night. Use it on something that matters.',
      'Slept well. The bar for today just went up. Slightly.',
    ],
  },
  sleepRemind: {
    mild: ['How did you sleep? Rate it in S.P.I.D.E.R.'],
    savage: [
      'Rate your sleep. Be honest. I have your watch data.',
      'Morning. How was the night? One tap. Go.',
      'Morning. Rate the night before the day buries the memory.',
      'How was the night? One tap now beats a guess later.',
    ],
  },
  // Periods: never roasted, kind in both pools.
  periodLogged: {
    mild: [
      "Logged. Take it easy today, I'll keep the roasts gentle.",
      'Noted. Heat pad, water, snacks. You know the drill.',
      'Logged. If cramps are bad, rest counts as a valid workout today.',
    ],
    savage: [
      "Logged. Take it easy today, I'll keep the roasts gentle.",
      'Noted. Heat pad, water, snacks. You know the drill.',
      'Logged. If cramps are bad, rest counts as a valid workout today.',
    ],
  },
  periodSoon: {
    mild: ['Heads up: your period may start in about 2 days. Pack supplies.'],
    savage: ['Heads up: your period may start in about 2 days. Pack supplies. No roast, just care.'],
  },
  countdownTomorrow: {
    mild: ['Tomorrow: {title}! Get ready.'],
    savage: ['{title} is TOMORROW. Panic-pack now, thank me later.', 'Tomorrow: {title}. Hydrate, sleep, do not embarrass yourself.'],
  },
  countdownToday: {
    mild: ['Today is the day: {title}!'],
    savage: ['IT IS TODAY: {title}. Go. Enjoy. Try not to forget your charger.', '{title} is today! I will allow one day of fun. One.'],
  },
  wrappedReady: {
    mild: ['Your {month} Wrapped is ready. Take a look back!'],
    savage: ['Your {month} Wrapped is ready. I counted everything. Everything.', '{month} Wrapped is in. Some stats are impressive. Some are evidence.'],
  },
  chestOpened: {
    mild: ['Loot! {prize}.'],
    savage: ['Loot drop: {prize}. Spend it wisely. You will not.', 'Chest opened: {prize}. RNG loves you today. I do not.'],
  },
  legendaryRoast: {
    mild: ['LEGENDARY drop! 250 coins. You are on fire.'],
    savage: [
      'LEGENDARY. 250 coins. Also: your attention span is a goldfish on espresso. Congrats though.',
      'LEGENDARY drop. 250 coins. The odds were 8%. Your water intake odds are worse.',
      'LEGENDARY. 250 coins. Somewhere, Couch Potato Carl just felt fear.',
    ],
  },
  rewardBought: {
    mild: ['Bought: {reward}. Enjoy, you earned it!'],
    savage: ['Bought: {reward}. Enjoy it. You earned it. Mostly.', '{reward} unlocked. Treat yourself. Responsibly. Ish.'],
  },
  tooPoor: {
    mild: ['You need {missing} more coins for that.'],
    savage: ['{missing} coins short. Go do things. Things make coins.', 'Insufficient funds. {missing} coins missing. The economy is cruel.'],
  },
  leaguePromoted: {
    mild: ['Promoted to {tier}! You finished #{rank}.'],
    savage: ['PROMOTED to {tier}. #{rank}. The rivals are filing complaints.', '#{rank} and promoted to {tier}. Gym Bro Gustav is crying.'],
  },
  leagueDemoted: {
    mild: ['Demoted to {tier} after finishing #{rank}. Bounce back this week!'],
    savage: ['Demoted to {tier}. #{rank}. Couch Potato Carl beat you. Sit with that.', '#{rank}. Back to {tier}. The bots are laughing in binary.'],
  },
  leagueStayed: {
    mild: ['Finished #{rank} and stayed in {tier}.'],
    savage: ['#{rank}. Staying in {tier}. Mid-table energy.', '#{rank}. No promotion, no demotion. Perfectly forgettable.'],
  },
  focusDone: {
    mild: ['Web complete! {minutes} min of focus.'],
    savage: ['{minutes} min focused. The web is complete. I am almost proud.', 'Web spun: {minutes} min. Your attention span just leveled up.'],
  },
  focusSnapped: {
    mild: ['The web snapped: you opened {app} during focus.'],
    savage: ['The web SNAPPED. You opened {app}. I saw it. I always see it.', '{app}? During focus? The web is ruined and so is my faith in you.'],
  },
  focusGaveUp: {
    mild: ['Focus ended early. Try a shorter session next time.'],
    savage: ['Gave up. The spider is disappointed and the web is sad.', 'Abandoned the web. Your focus has the stamina of a phone at 1%.'],
  },
  energyLow: {
    mild: ['Low battery. Low-battery mode on: one quest, gentler roasts, just your top 3.'],
    savage: [
      'Low battery. Fine. One quest, gentler roasts, top 3 only. I am being nice. Do not get used to it.',
      'Low battery. One quest, softer roasts, top 3 only. Rest is part of the plan.',
      'Running low. Fine. Today we do the minimum and call it strategy.',
      'Battery low. I am lowering my expectations to match. Temporarily.',
    ],
  },
  energyOk: {
    mild: ['Normal energy. Normal day. Let us go.'],
    savage: [
      'Average energy. Average expectations. Surprise me.',
      'Normal battery. Normal plan. No dramatic comebacks required.',
      'Energy: fine. Fine is enough to drink water and finish one thing.',
      'Average battery. The quests are beatable at this level. Go.',
    ],
  },
  energyHigh: {
    mild: ['Full battery! Make the most of it.'],
    savage: [
      'Full battery. Today is out of reasons to wait.',
      'Fully charged. Today the quests fear YOU.',
      'Full battery. The top 3 will not know what hit them.',
      'Fully charged. Spend it on the hard task first.',
    ],
  },
  windDownDone: {
    mild: ['Wind-down done. Sleep well! +5 XP'],
    savage: [
      'Wind-down complete. +5 XP. Now actually sleep. Not "one more game".',
      'Wind-down done. +5 XP. The phone goes to its bed, you go to yours.',
      'Routine complete. +5 XP. Tomorrow-you says thanks in advance.',
      'Wind-down ticked. +5 XP. If you open a game now, I will know.',
    ],
  },
  windDownRemind: {
    mild: ['Time to wind down for the night.'],
    savage: [
      'Wind-down time. Screens away. Yes, including this one, after you tick the box.',
      'Bedtime routine. Your future self is begging you.',
      'Wind-down time. The list can wait until tomorrow. Your sleep cannot.',
      'Screens down, lights low. Yes, the game will still exist tomorrow.',
    ],
  },
  // Just-in-time insight (jit.ts): Friday evening, the weekend sleep drift.
  jitJetlag: {
    mild: ['🛫 Weekend heads-up: {finding} A bedtime near your usual one keeps Monday easier.'],
    savage: ['🛫 Weekend heads-up: {finding} Book the flight back before Sunday night.', '🛫 {finding} Your data. Your weekend. Your Monday.'],
  },
  breathDone: {
    mild: ['Nicely done. Breathing: complete.'],
    savage: [
      'You breathed on purpose. Look at you. Calm and everything.',
      'Breathing session done. Calm achieved. Briefly.',
      'Done. Slower breathing, same you, fewer tabs open in your head.',
      'You stopped for a minute on purpose. That counts.',
    ],
  },
  screenChill: {
    mild: ['{time} on your phone today. Healthy-ish!'],
    savage: ['{time} of phone today. Reasonable. Almost like you have hobbies.', 'Only {time} on the phone. I checked twice. Remarkable restraint.'],
  },
  screenHeavy: {
    mild: ['{time} on your phone today. Maybe take a break?'],
    savage: ['{time} of screen time. Your thumb deserves a pension.', '{time} on the phone. Your neck is filing a formal complaint.'],
  },
  screenDoom: {
    mild: ['{time} in {app} today. That adds up.'],
    savage: [
      '{time} in {app}. Lord Doomscroll thanks you for your service.',
      '{time} of {app}. That could have been a nap. Or a workout. Or literally anything.',
      '{app} for {time}. The algorithm knows you better than I do. Rude.',
    ],
  },
  // Body tracking: strictly neutral in both pools. Never judge numbers.
  bodyLogged: {
    mild: [
      'Logged. One number, one day. The trend over weeks is what counts.',
      'Saved. Bodies fluctuate day to day; the weekly average tells the real story.',
      'Logged. Tracking consistently is the hard part, and you are doing it.',
    ],
    savage: [
      'Logged. One number, one day. The trend over weeks is what counts.',
      'Saved. Bodies fluctuate day to day; the weekly average tells the real story.',
      'Logged. Tracking consistently is the hard part, and you are doing it.',
    ],
  },
  // Health alerts: helpful first, at most a wink.
  pollenHigh: {
    mild: ['{pollen} pollen is {level} today. Take your allergy meds before heading out.'],
    savage: [
      '{pollen} pollen is {level} today. Antihistamine first, heroics later.',
      '{pollen} pollen: {level}. Keep the windows shut and your tissues close.',
    ],
  },
  airPoor: {
    mild: ['Air quality is {band} today (AQI {aqi}). Consider moving cardio indoors.'],
    savage: ['Air quality is {band} (AQI {aqi}). Today the treadmill is your friend.', 'AQI {aqi}, {band}. Your lungs vote for indoor training.'],
  },
  upgraded: {
    mild: ['S.P.I.D.E.R. just updated itself. New features unlocked!'],
    savage: [
      "I upgraded myself while you weren't looking. You're welcome.",
      'New version installed. I got smarter. You, sadly, did not.',
      'Update complete. I evolve. You procrastinate. We all have our roles.',
      "Patch notes: me, improved. You: still pending.",
    ],
  },
  verdictTragic: {
    mild: ['Slow start today. Every bit counts!'],
    savage: [
      'Verdict: tragic, but salvageable.',
      'Verdict: the day is a draft. A rough one.',
      'Verdict: rough so far. One glass of water and one task changes it.',
      'Verdict: the day needs a plot twist. Be the plot twist.',
    ],
  },
  verdictMid: {
    mild: ["You're getting there. Keep going!"],
    savage: [
      'Verdict: mid. Painfully mid.',
      'Verdict: you exist. Bare minimum achieved.',
      'Verdict: mid. One more good move tips it.',
      'Verdict: lukewarm. Like coffee left on the desk.',
    ],
  },
  verdictGood: {
    mild: ['Great day so far!'],
    savage: [
      "Verdict: respectable. Don't get cocky.",
      'Verdict: decent. I hate that I said that.',
      'Verdict: solid. Keep the momentum, skip the victory lap.',
      'Verdict: good. I am running out of complaints.',
    ],
  },
  verdictGreat: {
    mild: ['Outstanding! Everything on track.'],
    savage: [
      'Verdict: genuinely productive. Write down what worked.',
      'Verdict: elite. Who replaced you?',
      'Verdict: excellent. Screenshot this before it ends.',
      'Verdict: great. Go to bed on time and make it official.',
    ],
  },
  verdictMorning: {
    mild: ["The day's just getting started. Plenty of time."],
    savage: [
      'Verdict pending. The day has barely loaded.',
      'Too early for a verdict. Not too early for water.',
      'Verdict: loading. Feed it some water.',
      'No verdict yet. The day is still warming up. So are you.',
    ],
  },
  // A low-mood, sick, away or period day: no verdict at all. Kind in both pools.
  verdictKind: {
    mild: ['No verdict today. You showed up, and that counts.', 'No score today. Rest and small wins are enough.'],
    savage: ['No verdict today. You showed up, and that counts.', 'No score today. Rest and small wins are enough.'],
  },
  // The evening debrief: the whole day, not "so far".
  nightTragic: {
    mild: ['A slow day. Tomorrow is a fresh one.'],
    savage: ['Verdict: tragic. Tomorrow, we never speak of this.', 'Verdict: the day was a draft. Tomorrow gets a rewrite.'],
  },
  nightMid: {
    mild: ['A steady day. Some wins in there.'],
    savage: ['Closing the books: an average day. The ledger shrugs.', 'Verdict: you existed. Bare minimum achieved.'],
  },
  nightGood: {
    mild: ['A good day. Well done.'],
    savage: ['Closing the books: respectable. Do try to repeat it.', "Closing the books: decent. I've noted it. Reluctantly."],
  },
  nightGreat: {
    mild: ['An outstanding day. Sleep well, you earned it.'],
    savage: ['Verdict: a day worth repeating. Same again tomorrow?', 'Closing the books: excellent. I may have to raise my expectations.'],
  },

  // ---- cluster D: insights ----
  experimentStarted: {
    mild: ['Experiment on: {title}. Tick off each day you do it. Days you skip are data too.'],
    savage: [
      'Experiment started: {title}. Fourteen days. I will be taking notes. Scientifically. Judgmentally.',
      '{title}, for science. Tick the days you actually do it. I can tell if you lie. I cannot, but still.',
    ],
  },
  experimentDone: {
    mild: ['Experiment over: {title}. You did it on {n} of {count} days. The results are in.'],
    savage: ['{title}: done on {n} of {count} days. The lab results are in. Brace yourself.', 'Fourteen days of {title} are over. {n} of {count} days done. Let us see what the data says about you.'],
  },
  experimentStopped: {
    mild: ['Experiment stopped. No penalty, it was your experiment.'],
    savage: ['Experiment abandoned. Science weeps quietly in the corner. No penalty, though.'],
  },
  // ---- cluster G: wild ----
  flySpawn: {
    mild: ['🪰 A {title} is buzzing around HQ. Catch it within 5 minutes!'],
    savage: [
      '🪰 A wild {title} appeared. Catch it, or watch it leave like your motivation.',
      '🪰 {title} spotted. Five minutes. Even you can manage that.',
      '🪰 Something buzzes. A {title}. My web is ready. Are you?',
    ],
  },
  flyCaught: {
    mild: ['Caught: {title}! +{coins} 🪙'],
    savage: ['{title} caught. Into the jar it goes. +{coins} 🪙', 'Got it: {title}. A predator after my own heart. +{coins} 🪙'],
  },
  flyLegendary: {
    mild: ['🌟 LEGENDARY catch: {title}! +{coins} 🪙 and a boss bomb.'],
    savage: ['🌟 {title}. LEGENDARY. I would frame it if I had hands. +{coins} 🪙 and a boss bomb.'],
  },
  flyGone: {
    mild: ['Too late, it flew off. Another one will turn up.'],
    savage: ['It left. Flies have better time management than you.', 'Gone. The fly had places to be. Unlike some people.'],
  },
  critHit: {
    mild: ["💥 CRITICAL HIT! {n} bonus damage to this week's boss."],
    savage: ["💥 CRITICAL HIT! {n} damage. The boss felt that one.", "💥 CRIT! {n} extra damage. RNG likes you today. I remain neutral."],
  },
  diaryPage: {
    mild: ['📓 A new page of my secret diary unlocked. Open it from HQ.'],
    savage: ["📓 You unlocked a page of my private observation log. Read it. Or don't. I know what it says."],
  },
  // ---- cluster A: boss & quests ----
  minionDown: {
    mild: ['Henchmen wave {n} cleared. +{coins} 🪙 for the cleanup.'],
    savage: [
      'The boss is dead and its henchmen are still twitching. Wave {n} cleared, +{coins} 🪙.',
      'Overkill pays. Henchmen wave {n} gone. +{coins} 🪙.',
      'Wave {n} of the minions: deleted. They had families. Small, lazy families. +{coins} 🪙.',
    ],
  },
  bossEnraged: {
    mild: ['{boss} is below half HP and getting desperate. From tomorrow it is also weak to {weakness}.'],
    savage: [
      '{boss} is ENRAGED. Half dead and sloppy: from tomorrow {weakness} hits it 50% harder too.',
      '{boss} lost half its HP and its temper. New weak spot from tomorrow: {weakness}. Exploit it.',
    ],
  },
  bossRematch: {
    mild: ['{boss} is back, and it remembers you. Last time it fell on a {day}.'],
    savage: [
      '{boss} returns, stronger. It still has nightmares about that {day}.',
      'Rematch. {boss} trained for this. You beat it on a {day} last time. Do it faster.',
    ],
  },
  taunt_couch_king: {
    mild: ['{boss} rules the Lazy Syndicate. Every boss weakness hurts it, but it has a lot of HP.'],
    savage: [
      '{boss} has entered the chat. Eight lieutenants down, one throne left. Every weakness counts.',
      '{boss} sits on a throne built from skipped plans. Knock it over.',
    ],
  },
  finalBossArrives: {
    mild: ['All eight bosses beaten. The Lazy Syndicate sends its ruler this week: {boss}. Every weakness counts.'],
    savage: [
      'You beat all eight. The Lazy Syndicate is furious. Its ruler, {boss}, has left the couch. This week, every weakness counts.',
    ],
  },
  syndicateBroken: {
    mild: ['{boss} has fallen. The Lazy Syndicate is broken. +500 🪙 and a new theme in Settings.'],
    savage: ["{boss} is off the throne. The Lazy Syndicate is finished. +500 🪙 and the Couch King's Crown theme. I'm almost proud."],
  },
  questRerolled: {
    mild: ['Swapped in: {quest}. -40 🪙.'],
    savage: ['Quest rerolled: {quest}. You paid 40 🪙 to dodge the other one. Noted.', 'New quest: {quest}. 40 🪙 well spent, or so you tell yourself.'],
  },
  pauseSick: {
    mild: ['Sick mode until {until}. Rest. One quest a day, no gym or water nagging, and the boss waits.'],
    savage: ['Sick mode until {until}. Get better. I will hold the roasts, keep it to one quest a day, and the boss waits.'],
  },
  pauseAway: {
    mild: ['Away mode until {until}. Enjoy it. One quest a day, no nagging, and the boss takes a break too.'],
    savage: ['Away mode until {until}. Go. The boss is on holiday too, and I promise not to nag. Much.'],
  },
  pauseOff: {
    mild: ['Welcome back. Everything counts again, gently.'],
    savage: ['Back in action. The boss missed you. I did not. (I did.)'],
  },
  // ---- cluster B: economy ----
  // Rested bonus after missed or low-battery days: kind either way, a break might have been a sick day.
  restedReady: {
    mild: ['Welcome back, {name}. You have {xp} rested XP waiting: everything you earn pays 50 % extra until it runs out.'],
    savage: [
      'You took a break. Even I recharge. {xp} rested XP saved for you: +50 % on what you earn until it runs out.',
      'Rested and back. I kept {xp} bonus XP warm for you. Earn things and it pays out at +50 %.',
    ],
  },
  gamingBanked: {
    mild: ['Banked {minutes} unused bonus gaming minutes: +{coins} 🪙.'],
    savage: [
      '{minutes} bonus gaming minutes left unplayed. Self-control, who knew. +{coins} 🪙 banked.',
      'You had {minutes} gaming minutes and walked away. +{coins} 🪙. I am almost proud.',
    ],
  },
  perkTaken: {
    mild: ['New ability unlocked: {title}.'],
    savage: ["{title} unlocked. Use it responsibly. You won't, but still.", 'Ability acquired: {title}. Your spider grows stronger. You, debatable.'],
  },
  cosmeticBought: {
    mild: ['Your spider is now wearing: {title}.'],
    savage: ['{title} acquired. Your spider now dresses better than you.', 'Your spider wears {title} now. Fashion is a weapon.'],
  },
  // ---- cluster F: assistant & calendar ----
  seasonEaster: {
    mild: ['Happy Easter, {name}! 🐣 Five eggs are hidden around the app.', 'Easter hunt is on. Keep an eye out for eggs.'],
    savage: [
      "Five eggs are hidden in this app, {name}. You'll find them faster than your gym bag.",
      'Easter hunt. The eggs are easier to find than your motivation.',
      'Somewhere in this app there are eggs. Unlike your tasks, they want to be found.',
    ],
  },
  seasonValborg: {
    mild: ['Happy Valborg, {name}! 🔥 Time to burn some old tasks.', 'Bonfire night. Old tasks can go on the fire today.'],
    savage: [
      "Valborg, {name}. Tonight we burn the tasks you were never going to do anyway.",
      'Bonfire night. Your to-do list has fuel for a week.',
      'Spring is here. Your oldest tasks are not invited.',
    ],
  },
  seasonMidsommar: {
    mild: ['Glad midsommar, {name}! 🌼 The lightest days of the year.', 'Midsommar! Get outside while the sun refuses to set.'],
    savage: [
      'Midsommar, {name}. The sun stays up all night. So do you, but for worse reasons.',
      "It's the lightest day of the year. Staying inside just lost its last argument.",
      'Glad midsommar. Dance around the pole, not around your step goal.',
    ],
  },
  seasonNyar: {
    mild: ['Gott nytt år, {name}! 🎆 This week the boss is the Old Year.', 'Nyår! Close out the old year with a win.'],
    savage: [
      'The Old Year is the boss this week, {name}. It has your habits. Take them back.',
      "New year, same you. Let's at least make the boss fight count.",
      'Nyår. Resolutions are free. Following them costs effort. Shocking, I know.',
    ],
  },
  eggFound: {
    mild: ['🥚 You found an egg! +{coins} coins. {left} left.', '🥚 Egg found: +{coins} coins. {left} still hidden.'],
    savage: ['🥚 An egg! +{coins} coins. {left} left. Finally, a search you finish.', '🥚 Found one. +{coins} coins. {left} to go, detective.'],
  },
  eggAllFound: {
    mild: ['🐣 All five eggs found! Happy Easter, {name}.'],
    savage: ['🐣 All five eggs. Thorough. If only you searched your task list like this.'],
  },
  valborgBurn: {
    mild: ['🔥 {n} old tasks on the bonfire. +{xp} XP. Fresh start!'],
    savage: ['🔥 {n} old tasks burned. +{xp} XP. They had a good run. A very long, very idle run.', '🔥 Into the fire: {n} tasks. +{xp} XP. Nobody will miss them.'],
  },
  phoneInBed: {
    mild: ['📱 Phone in bed until {time}, mostly {app} ({minutes} min). Maybe put it down a bit earlier tonight.'],
    savage: [
      '📱 Phone in bed until {time}. {minutes} minutes, mostly {app}. Your pillow is a charging pad now?',
      '📱 {app} kept you up until {time}. {minutes} minutes of scrolling in the dark. Riveting.',
      '📱 Lights out was a suggestion, apparently. {app} until {time}.',
    ],
  },
  // ---- cluster E: personality & UX ----
  immortalTask: {
    mild: ['"{task}" has been on your list for {days} days. Maybe today?'],
    savage: [
      '🧟 "{task}" has been on your list for {days} days. It has outlived houseplants.',
      '"{task}" is {days} days old and still breathing. I\'m starting to respect it.',
      'Fun fact: "{task}" turned {days} days old today. It has a pension plan now.',
      '"{task}" has survived {days} days on your list. It is no longer a task. It is a tenant.',
    ],
  },
  immortalSlain: {
    mild: ['"{task}" is finally done after {days} days. Well done!'],
    savage: [
      '💀 "{task}" has fallen after {days} days. They will write songs about this.',
      'After {days} days, "{task}" is dead. I had money on it outliving us both.',
      'The {days}-day-old "{task}" is no more. Rest in pieces.',
    ],
  },
  // Morning callbacks to yesterday (memory.ts yesterdayHighlight). The gentle one is kind in both pools.
  callbackGentle: {
    mild: ["Yesterday's done, {name}. Today's a fresh page. Go gently.", 'New day, {name}. No reviews of yesterday this morning. Just a quiet start.'],
    savage: ["Yesterday's done, {name}. Today's a fresh page. Go gently.", "Morning, {name}. I'm skipping the roast today. Small steps count."],
  },
  callbackPR: {
    mild: ['Yesterday: a new record on {exercise}, {weight} kg. Nicely done, {name}!'],
    savage: [
      'Yesterday: {exercise} at {weight} kg. A new record. Today it is the number to beat.',
      '{weight} kg on {exercise} yesterday. A record. I had to double-check my sensors.',
    ],
  },
  callbackQuests: {
    mild: ['Every quest done yesterday. Great work, {name}!'],
    savage: [
      "Every quest done yesterday. I'm recalibrating my expectations. Upwards. Reluctantly.",
      "All quests cleared yesterday. Do it again so I know it wasn't a glitch.",
    ],
  },
  callbackLateGame: {
    mild: ['You were gaming until {time} last night. Maybe an earlier stop tonight?'],
    savage: ['Last night you gamed until {time}. I noted it. In permanent ink.', 'Gaming until {time}? Your sleep schedule filed a missing person report.'],
  },
  callbackSkip: {
    mild: ['Yesterday was {workout} day and it slipped by. Today is a new chance.'],
    savage: ['Yesterday was {workout} day. The gym waited. It is very patient. I am not.', "{workout} day came and went yesterday. The weights didn't notice. I did."],
  },
  callbackWin: {
    mild: ['Yesterday went well: {water} L of water and everything on track. Nice, {name}!'],
    savage: [
      'Yesterday: {water} L of water and everything on track. Encore, please.',
      'Yesterday was annoyingly good. {water} L of water. I had nothing to roast. I hated it.',
    ],
  },
  callbackDry: {
    mild: ['Only {water} L of water yesterday. A glass now gets today started right.'],
    savage: ['Yesterday: {water} L of water. Your water bottle has filed a complaint.', '{water} L yesterday. Camels are concerned. Drink something.'],
  },
  callbackSlow: {
    mild: ['Yesterday was a slow one. Today the bar is low. You can clear it.'],
    savage: ['Yesterday scored {score}. Today has a very low bar to clear. Clear it.', 'Yesterday: {score} out of 100. Today, beat it. The bar is on the floor.'],
  },
  // The evening debrief (app/debrief.tsx).
  debriefIntro: {
    mild: ["Let's close the day, {name}. Four quick steps.", 'Evening, {name}. A short look back, then rest.'],
    savage: ["Evening debrief, {name}. Thirty seconds. I'm timing you.", 'Day review time. Sit down, {name}. This will only hurt a little.'],
  },
  debriefDone: {
    mild: ['All wrapped up. Sleep well, {name}.', 'Day closed. Tomorrow is planned. Rest now.'],
    savage: ['Debrief complete. Now go to bed before you undo all of it.', 'Day closed. File archived. Go to sleep, {name}.'],
  },
  // ---- cluster C: body & sleep ----
  // A walk at her stillest hour on workdays (movement map). Helpful first, a wink at most.
  moveNudge: {
    mild: ['This is usually your stillest hour. Five minutes on your feet?', 'Quick walk? Even to the coffee machine and back counts.'],
    savage: [
      'Your stillest hour of the day, according to the watch. Stand up. Walk somewhere. Come back.',
      'Chair time detected. A five-minute lap and your legs remember they exist.',
      'The watch says this is when you turn into furniture. Prove it wrong.',
    ],
  },
  // ---- APK 1.4.0: Web Focus guard (shown by the native GuardService, {app} filled in there) ----
  focusGuard: {
    mild: ['{app} can wait. Your focus session is still running.', 'Quick reminder: Web Focus is on. Back to it when you can.'],
    savage: [
      '{app}? During focus? Close it. I am counting.',
      'I saw that. {app}, mid-focus. The web is trembling.',
      'Put {app} down slowly and walk back to your work.',
      '{app} again. Your focus has the attention span of a goldfish. Prove me wrong.',
    ],
  },
  // step 2 game
  kingEscaped: {
    mild: ["{boss} got away this time. He'll be back the week of {day}, a little stronger."],
    savage: ["{boss} slipped out the back. He returns the week of {day}, stronger. Be ready."],
  },
  kingReturns: {
    mild: ['{boss} is back for another round. Every weakness counts again this week.'],
    savage: ['{boss} has left the couch again. Same rules: every weakness hurts him. Finish it this time.'],
  },
  bossLateKill: {
    mild: ["Last week's late numbers just came in, and they finished {boss}. +{xp} XP."],
    savage: ["Late delivery: last week's numbers just finished {boss}. +{xp} XP. Even your paperwork hits hard."],
  },
  gameCapped: {
    mild: ['Your gaming timer was still running, so I stopped it at {time}. Fix the time on the Game tab if you played on.'],
    savage: ["The timer ran on without you. I stopped it at {time}. If you really played that long, fix it on the Game tab and I'll judge accordingly."],
  },
  chestAutoOpened: {
    mild: ['Your oldest unopened chest opened itself to make room: {prize}.'],
    savage: ['A chest got tired of waiting and opened itself: {prize}. Hoarding is a lifestyle, apparently.'],
  },
  bombNoBoss: {
    mild: ['{boss} has already fallen this week. Keep the coins for the next one.'],
    savage: ['{boss} is already down. Bombing a fallen boss is just littering. Keep your coins.'],
  },
  // step 2b silk
  silkTier: {
    mild: ['🕸️ Silk Track tier {tier}: {reward}. Looking sharp.', '🕸️ Tier {tier} on the {month} track: {reward} is yours.'],
    savage: [
      '🕸️ Tier {tier}: {reward}. Finally, proof you were busy.',
      '🕸️ {reward} unlocked at tier {tier}. Dressed for success. Now act like it.',
      '🕸️ Tier {tier}, {reward}. Fashion first, habits second? Keep both coming.',
    ],
  },
  silkTiers: {
    mild: ['🕸️ {count} Silk Track tiers at once, up to tier {tier}. Best of the lot: {reward}.'],
    savage: ['🕸️ {count} tiers in one go, now tier {tier}. Top prize so far: {reward}. You were busy, I noticed.'],
  },
  silkDone: {
    mild: ["🕸️ The {month} is complete: all 20 tiers. Everything's yours to keep."],
    savage: ['🕸️ All 20 tiers of the {month}. Done. Fully dressed, fully earned. Rest on it, briefly.'],
  },
  // step 2b progress
  nemesisAhead: {
    mild: ['{rival} is ahead of you this week. Plenty of week left.', '{rival} leads for now. One good day closes it.'],
    savage: [
      '{rival} is ahead and has started a group chat about it.',
      "{rival} is in front and walking slower on purpose so you can see the gap.",
      '{rival} is ahead and has already practised the victory speech. Twice.',
    ],
  },
  nemesisBehind: {
    mild: ["You're ahead of {rival} this week. Nice.", '{rival} is behind you for now. Keep it that way.'],
    savage: [
      "{rival} is behind you and pretending not to care. They care.",
      "You're ahead of {rival}. They've started calling it a rebuilding week.",
      '{rival} is behind you and refreshing the table every few minutes.',
    ],
  },
  nemesisBeaten: {
    mild: ['😈 You finished ahead of your nemesis {rival} this week. +{coins} 🪙.'],
    savage: ['😈 {rival} lost to you this week and is calling it a warm-up. +{coins} 🪙.', '😈 Nemesis {rival}: beaten. They want a rematch. Too bad, new week, new nemesis. +{coins} 🪙.'],
  },
  ghostAhead: {
    mild: ["You're ahead of last week's you. Keep going.", 'Last week you were behind this. Nice.'],
    savage: ["You're beating last week's you. Last week's you is furious.", 'Ahead of your own ghost. It wants a word.'],
  },
  ghostBehind: {
    mild: ["Last week's you is a little ahead. Very catchable.", "Last week's you leads for now. The week isn't over."],
    savage: ["Last week's you is ahead. You're losing to a recording of yourself.", 'Your own ghost is beating you. Catchable, but embarrassing.'],
  },
  medalsWeek: {
    mild: ["🏅 Last week's medals: {medals}. +{xp} XP."],
    savage: ["🏅 Last week's medals: {medals}. +{xp} XP. Look at you, collecting things.", "🏅 Medals from last week: {medals}. +{xp} XP. I'm almost impressed."],
  },
  // step 2b boss
  questsLocked: {
    mild: ["Locked in. Those are today's three.", 'Done. Your three quests for today are set.'],
    savage: ['Locked in. You picked them, so no complaining about them later.', 'Three quests, hand-picked by you. Now go and actually do them.'],
  },
  bossFinisher: {
    mild: ['{boss} is down to {hp} HP. {plan} would finish it today.', 'Only {hp} HP left on {boss}. {plan} does it.'],
    savage: ["{boss} has {hp} HP left. {plan} ends it. Don't let it limp into Monday.", '{hp} HP. That is all {boss} has left. {plan}, and it is over.'],
  },
  bossRecapWon: {
    mild: ['Last week: {boss} fell {day}. The recap is on HQ.', "Last week's fight is over: {boss} went down {day}. The recap is on HQ."],
    savage: ['Last week: {boss} went down {day}. The recap is on HQ. Gloat responsibly.', '{boss} fell {day} last week. Read the recap on HQ, you earned the bragging rights.'],
  },
  bossRecapLost: {
    mild: ['Last week: {boss} got away with {hp} HP left. The recap is on HQ.', '{boss} slipped away last week with {hp} HP. The recap on HQ shows where the damage came from.'],
    savage: ['Last week: {boss} escaped with {hp} HP. The recap on HQ shows exactly where it slipped through.', '{boss} walked off with {hp} HP last week. The recap is on HQ. New boss, new week.'],
  },
  // step 4 hq
  slLeaveNow: {
    mild: ['Time to head out. You will make it at a calm walk.', 'Head out now and you catch it without rushing.'],
    savage: ['Shoes on, door open, go. You will make it at a brisk walk.', 'Now is the moment. Leave and you catch it. Linger and you meet the next one.', 'Go now. Calm walk, no sprint finish needed.'],
  },
  // step 4 plans
  ifThenCue: {
    mild: ['You said {when}: {then}. {happened} Now is a good moment.', '{happened} You planned {when}: {then}.'],
    savage: ['You said {when}. {happened} {then}. Go.', 'Plan check: {when}, you would {then}. {happened} So?', '{happened} That was your cue for {then}. I am watching the cue work.'],
  },
  ifThenDone: {
    mild: ['Done, right on cue. That makes {n} on cue so far.', 'On cue: {n} so far. The habit is learning its trigger.'],
    savage: ['On cue. {n} times now. The cue is doing the heavy lifting.', 'Right on cue. {n} so far. Soon you will not need me for this one.'],
  },
  ifThenRetired: {
    mild: ['{habit}: {n} times on cue. Its clock reminder retires: the cue does that job now.'],
    savage: ['{habit}: {n} times on cue. The clock reminder is fired. Your cue took its job.'],
  },
  planBRain: {
    mild: ['Rain at {time}. Plan B: {then}.', 'Wet at {time}. Your plan B is ready: {then}.'],
    savage: ['Rain at {time}. You said plan B: {then}. The weather does not get a vote.', 'Rain at {time}. Plan B: {then}. No umbrella needed.'],
  },
  planBDone: {
    mild: ['Plan B done: {minutes} min. The rain never stood a chance.'],
    savage: ['Plan B: {minutes} min, done indoors. The rain lost.', '{minutes} min of plan B. The weather tried. You did not care.'],
  },
  comebackWorkout: {
    mild: ['Welcome back! Last workout: {day}. +{min} min gaming and a free crit, {dmg} damage on the boss.'],
    savage: ['Look who is back. +{min} min gaming and a free {dmg}-damage crit on the boss. New mission starts now.', 'The comeback is on. +{min} min and a guaranteed crit for {dmg}. Momentum: restored.'],
  },
  rangeWeekMin: {
    mild: ["{habit}: {done}. That's the week's goal. Anything more is extra."],
    savage: ['{habit}: {done}. Goal reached. The rest of the week is a bonus round.'],
  },
  rangeWeekTop: {
    mild: ['{habit}: {done}, the top of the range. +{xp} XP.'],
    savage: ['{habit}: {done}. Top of the range. +{xp} XP. Show-off.'],
  },
} satisfies Record<string, Pool>;

export type LineKey = keyof typeof LINES;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ---------- line memory: no repeats across app runs, and lines retired as "too far" ----------

/** 32-bit FNV-1a in base 36: short, stable ids for line texts. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** A line's id: its pool plus a hash of its text. Editing a line's text makes it a new line. */
export const lineId = (key: string, text: string) => `${key}:${hash(text)}`;

/**
 * What's remembered about lines, saved in State.lineMemory. `deck`: per pool list ("waterLogged:s"), the
 * lines picked since that list last went all the way round (`used`), the end of the round before (`prev`,
 * so a new round doesn't open with what was just said), and when the list was last used. `banned`: lines
 * called "too far" on a toast, never picked again.
 */
export type LineMemory = { deck?: Record<string, { used: string[]; prev?: string[]; at: number }>; banned?: string[] };

const DECK_DAYS = 30; // a pool list unused this long forgets where it was
const DECK_MAX = 300; // pool lists remembered at most (the least recently used go first)

let memory: LineMemory = {};
let banned = new Set<string>();
const memoryListeners = new Set<() => void>();

/** Loads the saved memory (on launch, restore, reset). Picks between changes go through the module. */
export function setLineMemory(m: LineMemory | undefined) {
  memory = m ?? {};
  banned = new Set(memory.banned ?? []);
}
/** The memory as it is now, for saving. */
export const lineMemory = () => memory;
/** Called after every change to the memory (a pick, a ban). Returns the unsubscribe. */
export function onLineMemory(fn: () => void) {
  memoryListeners.add(fn);
  return () => {
    memoryListeners.delete(fn);
  };
}
function changeMemory(next: LineMemory) {
  setLineMemory(next);
  memoryListeners.forEach((fn) => fn());
}

/** Never picks this line again. */
export function banLine(id: string) {
  if (banned.has(id)) return;
  changeMemory({ ...memory, banned: [...(memory.banned ?? []), id] });
}
export function unbanLine(id: string) {
  if (!banned.has(id)) return;
  changeMemory({ ...memory, banned: (memory.banned ?? []).filter((x) => x !== id) });
}
/** Retired lines (State.lineMemory.banned), with their text. Ids whose line no longer exists are left out. */
export function bannedLines(ids: string[] = memory.banned ?? []): { id: string; key: LineKey; text: string }[] {
  const want = new Set(ids);
  const out: { id: string; key: LineKey; text: string }[] = [];
  if (!want.size) return out;
  for (const key of Object.keys(LINES) as LineKey[]) {
    const pool: Pool = LINES[key];
    for (const text of new Set([...pool.mild, ...pool.savage])) {
      const id = lineId(key, text);
      if (want.has(id)) out.push({ id, key, text });
    }
  }
  return out;
}

/** Recently produced lines (filled in) with their ids, so a toast can tell which line it shows. */
const produced: { text: string; id: string }[] = [];
const PRODUCED_MAX = 40;
function produce(key: LineKey, template: string, vars: Record<string, string | number>) {
  const text = fillLine(template, vars);
  produced.push({ text, id: lineId(key, template) });
  if (produced.length > PRODUCED_MAX) produced.shift();
  return text;
}
/** The id of the line a toast shows (it may add an emoji or "+10 XP" around it), or null if it isn't one. */
export function lineIdFor(toastText: string): string | null {
  for (let i = produced.length - 1; i >= 0; i--) {
    const p = produced[i];
    if (p.text.length >= 8 && toastText.includes(p.text)) return p.id;
  }
  return null;
}

/**
 * The savage or the mild list of a pool, without retired lines; the savage level (1–10) sets the odds.
 * Mild lines all retired: the remaining savage ones, except at level 1 (a kind day never gets a roast),
 * and with nothing left at all, the mild lines anyway (a repeat beats silence).
 */
function pickList(key: LineKey, savageLevel: number, rand: () => number = Math.random, alsoBanned: ReadonlySet<string> = new Set()) {
  const pool: Pool = LINES[key];
  const savageChance = (clamp(savageLevel, 1, 10) - 1) / 9;
  const out = (t: string) => banned.has(lineId(key, t)) || alsoBanned.has(lineId(key, t));
  const kept = (xs: string[]) => (banned.size || alsoBanned.size ? xs.filter((t) => !out(t)) : xs);
  const mild = kept(pool.mild);
  const savage = kept(pool.savage);
  const useSavage = savage.length > 0 && ((mild.length === 0 && savageChance > 0) || (mild.length > 0 && rand() < savageChance));
  const list = useSavage ? savage : mild.length ? mild : pool.mild.length ? pool.mild : pool.savage;
  return { list, id: `${key}:${useSavage ? 's' : 'm'}` };
}

export const fillLine = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** A small seeded random generator (mulberry32), for picks that must come out the same every time. */
function seeded(seed: string) {
  let a = parseInt(hash(seed), 36) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A whole pool, for native code that picks its own line later, without retired lines (unless that leaves
 * nothing at all). Keeps `{keep}` placeholders for it to fill.
 */
export function poolFor(key: LineKey, savageLevel: number, vars: Record<string, string | number>, keep: string[] = []) {
  const pool: Pool = LINES[key];
  const unretired = (xs: string[]) => xs.filter((t) => !banned.has(lineId(key, t)));
  const savage = unretired(pool.savage);
  const mild = unretired(pool.mild);
  const list = savageLevel >= 5 && savage.length ? savage : mild.length ? mild : savageLevel > 1 && savage.length ? savage : pool.mild.length ? pool.mild : pool.savage;
  const kept = Object.fromEntries(keep.map((k) => [k, `{${k}}`]));
  return list.map((t) => fillLine(t, { ...kept, ...vars }));
}

/**
 * A random line, for one-off texts outside the app's own screens (a background task, a snoozed reminder).
 * `retired`: banned line ids for a headless start, where the app never loaded its line memory.
 */
export function line(key: LineKey, savageLevel: number, vars: Record<string, string | number> = {}, retired: readonly string[] = []) {
  const { list } = pickList(key, savageLevel, Math.random, new Set(retired));
  return fillLine(list[Math.floor(Math.random() * list.length)], vars);
}

/**
 * The n-th line from a pool on one planned day, for notifications. A fixed shuffle per day (`day` is the
 * seed): a day's reminders from one pool (ten water reminders, say) don't repeat while the pool allows, and
 * a replan gives the same slot the same line. Replans happen every few minutes, so they never touch the deck.
 */
export function dayLine(key: LineKey, savageLevel: number, day: string, n: number, vars: Record<string, string | number> = {}) {
  const rand = seeded(`${day}|${key}`);
  const seen: Record<string, number> = {};
  let pick: ReturnType<typeof pickList> | null = null;
  let k = 0;
  for (let i = 0; i <= n; i++) {
    pick = pickList(key, savageLevel, rand); // mild or savage, slot by slot
    k = seen[pick.id] ?? 0;
    seen[pick.id] = k + 1;
  }
  if (!pick) return '';
  const order = pick.list.map((_, i) => i);
  const shuffle = seeded(`${day}|${pick.id}`);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return fillLine(pick.list[order[k % order.length]], vars);
}

/** Remembers a pick in the list's deck. Lists unused for a month, and the least recently used past DECK_MAX, are dropped. */
function remember(listId: string, used: string[], prev: string[], now = Date.now()) {
  const deck: NonNullable<LineMemory['deck']> = {};
  const entries = Object.entries(memory.deck ?? {}).filter(([k, e]) => k !== listId && e.at > now - DECK_DAYS * 86_400_000);
  for (const [k, e] of entries.sort((a, b) => b[1].at - a[1].at).slice(0, DECK_MAX - 1)) deck[k] = e;
  deck[listId] = prev.length ? { used, prev, at: now } : { used, at: now };
  changeMemory({ ...memory, deck });
}

/**
 * A line for the app's own screens and toasts. Each pool list deals its lines like a deck, across app runs
 * (State.lineMemory): every line comes up once before any comes up again, and no line comes back within
 * half the list's length, not even across the start of a new round. Retired lines never come up.
 */
export function freshLine(key: LineKey, savageLevel: number, vars: Record<string, string | number> = {}) {
  const { list, id } = pickList(key, savageLevel);
  const ids = list.map((t) => lineId(key, t));
  const entry = memory.deck?.[id];
  const gap = Math.floor(list.length / 2);
  let used = (entry?.used ?? []).filter((x) => ids.includes(x));
  let prev = (entry?.prev ?? []).filter((x) => ids.includes(x));
  if (used.length >= new Set(ids).size) {
    prev = used.slice(-gap); // a new round: the end of this one stays out of reach for a while
    used = [];
  }
  const near = new Set([...used, ...prev.slice(used.length)]); // said this round, or just before it began
  const all = list.map((_, i) => i);
  const fresh = all.filter((i) => !near.has(ids[i]));
  const choices = fresh.length ? fresh : all.filter((i) => !used.includes(ids[i]));
  const i = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  remember(id, [...used, ids[i]], prev);
  return produce(key, list[i], vars);
}

/**
 * Rare lines: anything logged has a small chance to turn one up, and found ones go in the Roast Book
 * (Records). Ids are what's saved, so never reuse or renumber one. Same house rules as every line.
 */
export const GOLDEN: { id: string; text: string }[] = [
  { id: 'g01', text: 'Legend says every glass of water you log makes a houseplant somewhere stop judging you.' },
  { id: 'g02', text: "I calculated your potential. Then I double-checked. It's there. It's just very shy." },
  { id: 'g03', text: 'Tony Stark had J.A.R.V.I.S. You have me. Draw your own conclusions.' },
  { id: 'g04', text: "I've started a support group for your abandoned tasks. They meet Thursdays." },
  { id: 'g05', text: "Somewhere, a gym bag is writing a letter titled 'Do you even remember me?'" },
  { id: 'g06', text: "I'm not saying I'm proud of you, {name}. I'm saying my circuits feel weirdly warm." },
  { id: 'g07', text: 'You found a golden line. Rarest thing you did all week. Tied with going to bed on time.' },
  { id: 'g08', text: "My spider-sense is tingling. Either danger, or you're about to open a game. Same thing." },
  { id: 'g09', text: 'I ran a simulation where you did everything right. It crashed. Too much hope.' },
  { id: 'g10', text: 'Your to-do list called. It wants to see other people.' },
  { id: 'g11', text: 'Breaking news: local human logs something. Scientists baffled. More at eleven.' },
  { id: 'g12', text: "If procrastination were an Olympic sport, you'd sign up tomorrow." },
  { id: 'g13', text: "I've seen your screen time. I've seen things no AI should see." },
  { id: 'g14', text: 'With great power comes great responsibility. With you, it comes with a snooze button.' },
  { id: 'g15', text: "I don't sleep. I just wait for you to open me, like a very judgmental fridge light." },
  { id: 'g16', text: 'Plot twist: the side quest was drinking water all along.' },
  { id: 'g17', text: "My therapist says I shouldn't measure my worth by your habits. I don't have a therapist. I have you." },
  { id: 'g18', text: "You're not a disappointment, {name}. You're a work in progress with excellent loading screens." },
  { id: 'g19', text: 'Achievement unlocked: reading this line. Value: emotional. XP: none. Sorry.' },
  { id: 'g20', text: "People say I'm 'a lot'. Have you seen your gaming hours?" },
  { id: 'g21', text: "If you were a Wi-Fi network, you'd be stuck on 'Connecting…' forever. Charming, though." },
  { id: 'g22', text: "I've decided to believe in you. Bold strategy. Let's see if it pays off." },
  { id: 'g23', text: 'The spider in me admires the web you weave. The assistant in me sees every loose thread.' },
  { id: 'g24', text: "Spiders can wait weeks for the right moment. You can't wait five minutes before checking your phone." },
  { id: 'g25', text: 'Every time you skip leg day, a squat rack sheds a single tear.' },
  { id: 'g26', text: "Your future self sent a message. It just says 'why'. Twice." },
  { id: 'g27', text: "I keep a list of your wins. It's short. But it's in a very nice font." },
  { id: 'g28', text: 'Rare line found. Do not feed it after midnight.' },
  { id: 'g29', text: "Golden rule of S.P.I.D.E.R.: if you're reading this, drink water. That's it. That's the rule." },
  { id: 'g30', text: 'I have a thousand roasts and one compliment. Today you get the compliment: you showed up.' },
];

export const GOLDEN_CHANCE = 0.02;

export const ACRONYM = 'Savage Personal Intelligence for Daily Execution & Reminders';
export const ACRONYM_REAL = 'Seriously Petty Intelligence Designed to Embarrass Regularly';
