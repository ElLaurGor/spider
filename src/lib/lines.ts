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
      "Oh good, you're awake. The day was going so well without you.",
      "Morning, {name}. Today's forecast: 100% chance of me judging you.",
      "Welcome back to consciousness, {name}. Let's not waste it like yesterday.",
    ],
  },
  greetAfternoon: {
    mild: ['Good afternoon, {name}. Halfway there.', 'Afternoon check-in, {name}. How are we doing?'],
    savage: [
      'Good afternoon, {name}. Half the day is gone. Much like your motivation.',
      'Afternoon, {name}. Still time to turn this day around. Not much. But some.',
      "Ah, {name}. Back to check how badly the day is going? Let's look together.",
      "If productivity were a sport, you'd be on the bench, {name}. Let's fix that.",
    ],
  },
  greetEvening: {
    mild: ["Good evening, {name}. Let's wrap up the day.", 'Evening, {name}. Time to wind down.'],
    savage: [
      "Evening, {name}. Let's review the damage.",
      'Good evening. The day is almost over. Your excuses, sadly, are not.',
      "Evening, {name}. Gaming time is near. Have you earned it? Don't answer. I have data.",
      'Evening report incoming. Brace yourself, {name}.',
    ],
  },
  greetNight: {
    mild: ["It's late, {name}. Sleep is a feature, not a bug.", 'Night mode, {name}. Get some rest.'],
    savage: [
      "It's late, {name}. Even I'm tired of you, and I'm software.",
      'Go to sleep, {name}. Your future self is already filing a complaint.',
      'Still awake? Bold strategy. Tomorrow-you will hate this.',
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
      'You tapped me. Bold of you to poke something smarter than you.',
      "I'm busy calculating how many glasses of water you owe me.",
      "Tony Stark built J.A.R.V.I.S. in a cave. You can't even build a habit.",
      "Poke me again and I'm scheduling leg day for every day.",
      'I have read your gaming stats. I need a moment.',
      "Need motivation, {name}? I'm an app, not a miracle worker.",
      "My spider-sense is tingling. It says you're procrastinating.",
      "With great power comes great responsibility. You have neither, but we're working on it.",
      "I'd roast you harder, but I'm saving my energy for your evening report.",
      "Error 404: {name}'s discipline not found.",
    ],
  },
  // Weekly contract (contracts.ts). A voided contract (rough week) is kind in both pools.
  contractSigned: {
    mild: ['Contract signed: {goal}. {stake} coins at stake. You can do this, {name}.'],
    savage: [
      "Contract signed: {goal}. {stake} coins say you can. I've already spent them in my head.",
      '{stake} coins on "{goal}". Bold. I love a bet I expect to win.',
    ],
  },
  contractWon: {
    mild: ['Contract fulfilled! +{coins} coins. Well done, {name}.'],
    savage: ['Contract fulfilled. +{coins} coins. I had plans for those. Fine.', 'You actually did it. +{coins} coins. I demand a rematch.'],
  },
  contractLost: {
    mild: ["Last week's contract wasn't reached. The {stake} coins are gone, but this week is a fresh one."],
    savage: ['Contract missed. {stake} coins are mine now. Pleasure doing business.', "{stake} coins, gone. I'll treasure them. This week, prove me wrong."],
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
  seasonLucia: {
    mild: ['Glad Lucia, {name}! 🕯️ Bring a little light today.'],
    savage: ['Glad Lucia, {name}. Saffron buns are mandatory. I checked. The quest is optional. Barely.', "Lucia brings the light. You bring… let's see."],
  },
  seasonSolstice: {
    mild: ['Darkest day of the year, {name}. From tomorrow the light comes back. 🌑'],
    savage: ['Shortest day of the year. Your excuses should be short too.', "Winter solstice. It can't get any darker than this. Promise."],
  },
  firstSnow: {
    mild: ['❄️ First snow of the winter today! Dress warm, {name}.'],
    savage: ['❄️ First snow of the winter. Nature is doing your leg day for you: shovelling.', '❄️ It snows today. Your excuse to skip the walk just got prettier.'],
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
    savage: ["You've had a couple of good days. I'm suspicious.", 'Respect pending. Results required.', "I'm watching. Mostly hoping. Partly judging."],
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
      'Splendid. Only {left} ml left until you count as a real person.',
      'Hydration acquired. Ego also slightly hydrated.',
    ],
  },
  waterGoal: {
    mild: ['Water goal reached! Amazing work, {name}.'],
    savage: [
      "Water goal reached. I'm genuinely shocked. Recalibrating my expectations.",
      "Goal hit. You're officially more hydrated than a houseplant. Barely.",
      "Hydration Overlord. Don't let it go to your head. Let it go to your kidneys.",
    ],
  },
  gymRemind: {
    mild: ['{workout} in 30 minutes. Get your gear ready!', "Gym time soon: {workout}. You've got this."],
    savage: [
      '{workout} in 30 minutes. Your excuses have been pre-rejected.',
      '{workout} today. The couch has been notified of your departure.',
      "Gym in 30. If you skip, I'll tell the dumbbells. They talk.",
      '{workout} is waiting. So are your muscles. Somewhere. Allegedly.',
      "Pack your bag. And no, 'I'm tired' is not a training split.",
    ],
  },
  gymShame: {
    mild: ['No workout logged yet today. Still time!', "Did you train? Don't forget to log it."],
    savage: [
      'No {workout} logged. Did you work out or just think about it really hard?',
      'Gym status: skipped. Muscles: disappointed. Me: unsurprised.',
      "Still no workout. The weights miss you. I don't, but they do.",
      "If you trained and didn't log it, did it even happen? No. No it didn't.",
    ],
  },
  gymStarted: {
    mild: ['Workout started! +20 XP and +30 min gaming earned.'],
    savage: [
      "Workout started. +30 min gaming earned. Don't spend it all in one rage-quit.",
      'Look who showed up. +20 XP. The bar was low, but you cleared it.',
      'First set down. The couch is filing a missing person report.',
    ],
  },
  gymSet: {
    mild: ['Set logged: {weight} kg × {reps}. Nice!', 'Good set!'],
    savage: [
      "{weight} kg × {reps}. Adequate. I've seen worse. Mostly from you.",
      'Set logged. Your muscles are confused but cooperating.',
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
      'Rest day. Finally, something you are naturally good at.',
      'Rest day. Try not to turn it into a lifestyle.',
      "Rest day. Your muscles rebuild today. Your discipline, sadly, doesn't.",
    ],
  },
  restOver: {
    mild: ["Rest's over. Next set!"],
    savage: [
      'Rest over. Get back under the bar before your phone eats you alive.',
      "Break's over. The weights didn't lift themselves while you scrolled.",
      "Time's up. Next set. Chop chop.",
    ],
  },
  foodLogged: {
    mild: ['Logged. Fuel up, {name}.', 'Got it. Meal logged.'],
    savage: [
      "Logged. I'm not judging. I'm just keeping receipts.",
      'Meal logged. Your stomach and I are now in a group chat.',
      'Noted. Data is power, and you just handed me some.',
      'Fuel logged. Engine status: running. Barely, but running.',
    ],
  },
  proteinGoal: {
    mild: ['Protein goal reached!'],
    savage: [
      'Protein goal hit. Your muscles finally have building materials. No more excuses.',
      'Protein goal reached. Protein Goblin mode: activated.',
    ],
  },
  foodNone: {
    mild: ["No meals logged yet today. Don't forget to eat!"],
    savage: [
      "Zero meals logged. Either you're photosynthesizing or you forgot to tell me.",
      'Nothing eaten? Even your phone gets charged. Eat something. Then log it.',
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
      "Over budget and pressing Start. Bold. I'm noting this in your permanent record.",
    ],
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
    mild: ["You're 30 minutes over your gaming budget."],
    savage: [
      "30 minutes over budget. I'm not mad. I'm just deducting XP.",
      'Still playing? Your sleep schedule just filed for divorce.',
      "30 minutes over. At this point you don't game there, you live there.",
    ],
  },
  gameStopGood: {
    mild: ['Session ended. Nice self-control!'],
    savage: [
      'You stopped within budget. Who are you and what have you done with {name}?',
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
      'Shorter than the timer said, huh. {xp} XP refunded. Suspiciously.',
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
      'Morning. {events}. {workout}. And zero water so far. Strong start.',
      "Wake up, {name}. {events}. {workout}. Let's pretend you're ready.",
      'Rise and grind. Or just rise. {events}. {workout}.',
    ],
  },
  eveningReport: {
    mild: ["Today's report: {summary}"],
    savage: [
      "Evening report: {summary}. I've seen better. I've also seen worse. Mostly from you.",
      'Daily verdict: {summary}. Tomorrow we try harder. Mostly you.',
      "Report card: {summary}. I'll let you decide if that's a pass.",
    ],
  },
  comeback: {
    mild: ['We miss you! Open S.P.I.D.E.R. to check your day.'],
    savage: [
      "You haven't opened me in days. I'm not clingy, I'm just tracking you.",
      'Hello? Did you replace me with a paper calendar? Rude.',
      'It has been days. Your habits have unionized and gone on strike.',
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
      'Bean juice acquired. {mg} mg and counting.',
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
    ],
  },
  moodGreat: {
    mild: ['Great mood logged! Love that for you.'],
    savage: ["Great mood? Suspicious, but I'll allow it.", 'Feeling great. Ride that energy. Preferably to the gym.'],
  },
  moodGood: {
    mild: ['Good mood logged. Nice!'],
    savage: ['Good vibes logged. Do not waste them on scrolling.', 'Good mood detected. Productivity is now mandatory.'],
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
      '{steps} steps today. Even a houseplant gets moved more often.',
      'Step count: {steps}. Bold of you to own legs and not use them.',
    ],
  },
  stepsMid: {
    mild: ['{steps} steps. Over halfway there!'],
    savage: ['{steps} steps. Halfway. Like most of your projects.', '{steps} steps. Respectable. Barely. Keep walking.'],
  },
  stepsHigh: {
    mild: ['{steps} steps. Goal done. Nice!'],
    savage: ['{steps} steps. Your legs deserve a raise.', '{steps} steps. Who is this athletic stranger?'],
  },
  sleepShort: {
    mild: ['Only {sleep} of sleep last night. Try to get to bed earlier tonight.'],
    savage: ['{sleep} of sleep. Bold strategy. Coffee will not save you. (It will try.)', '{sleep} of sleep. Zombie mode: activated.'],
  },
  sleepGood: {
    mild: ['{sleep} of sleep. Well rested!'],
    savage: ['{sleep} of sleep. Fully charged. No excuses today.', '{sleep} of sleep. Rested and still procrastinating? We will see.'],
  },
  progressPhoto: {
    mild: ['Progress photo saved. Future you will thank you.'],
    savage: [
      'Progress photo saved. I will keep it safe. And judge it quietly.',
      'Snap saved. Compare it in a month and thank me.',
      'Photo archived. The glow-up documentary has begun.',
    ],
  },
  mealPhoto: {
    mild: ['Meal photo saved with your log.'],
    savage: ['Food pic saved. Very influencer of you.', 'Meal photographed. The plate looked better before you ate it.'],
  },
  habitDone: {
    mild: ['{habit} done.', 'Nice! {habit} checked off.'],
    savage: [
      '{habit} done. Look at you, following through. Weird.',
      '{habit}: checked. Your future self just nodded approvingly.',
      '{habit} done. I had money on you skipping it.',
    ],
  },
  habitAllDone: {
    mild: ['All habits done today! +10 XP.'],
    savage: ['Every habit done. Disciplined. Suspiciously disciplined. +10 XP.', 'All habits checked. Who replaced you with a productive person? +10 XP.'],
  },
  habitRemind: {
    mild: ['Reminder: {habit}.'],
    savage: ['{habit}. Today. Not "later". Today.', '{habit} is still waiting. It is getting lonely.', '{habit} is still on the list. I am watching you.'],
  },
  questDone: {
    mild: ['Quest complete: {quest}! +{xp} XP'],
    savage: ['Quest complete: {quest}. +{xp} XP. The bards will sing of this. Quietly.', '{quest}: done. +{xp} XP. Achievement hunter energy.'],
  },
  questsAllDone: {
    mild: ['All 3 daily quests done! +30 XP and +15 min gaming.'],
    savage: ['Daily quests: cleared. +30 XP, +15 min gaming. Main character behavior.', 'All quests done. You have earned your loot. +30 XP, +15 min.'],
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
    savage: ["{boss} has heard about your water bottle. He's not worried.", '{boss} is drier than your excuses.', '{boss} rules the desert. Drown him.'],
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
    savage: ['This week was a draft. A bad one. Next week, we rewrite it.', 'I have seen houseplants with better weekly stats.'],
  },
  reportReady: {
    mild: ['Your weekly report card is ready.'],
    savage: ['Your week has been graded. Brace yourself.', 'Weekly report card is in. Sit down first.'],
  },
  weatherRain: {
    mild: ['{forecast}. Bring an umbrella.'],
    savage: ['{forecast}. Your umbrella called. It is tired of being forgotten.', '{forecast}. Perfect excuse to skip the walk. Denied.'],
  },
  weatherCold: {
    mild: ['{forecast}. Dress warm!'],
    savage: ['{forecast}. Wear a jacket. You are not as tough as you think.', '{forecast}. Cold outside, so gym inside. No excuses.'],
  },
  weatherHot: {
    mild: ['{forecast}. Stay hydrated!'],
    savage: ['{forecast}. Hot. Drink water or become a raisin.', '{forecast}. Your water goal just became non-negotiable.'],
  },
  weatherNice: {
    mild: ['{forecast}. Nice day for a walk.'],
    savage: ['{forecast}. Great weather. Wasted on you if you stay inside.', '{forecast}. Touch grass today. Literally.'],
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
      "{product}. {kcal} kcal per 100 g. I'm not judging. I'm calculating.",
      '{product}? Bold choice. {kcal} kcal per 100 g, for the record.',
      'Scanned. Knowledge is power. Especially about {product}.',
    ],
  },
  activityLogged: {
    mild: ['{activity}: {minutes} min logged. Nice work!'],
    savage: [
      '{minutes} min of {activity}. Your muscles filed a complaint. Denied.',
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
      'A terrible night. Zombie mode is not a personality. Early night today.',
    ],
  },
  rateSleepOk: {
    mild: ['An OK night. Thanks for rating it.'],
    savage: ['Mid sleep for a mid day? Let us aim higher tonight.', 'OK sleep. Not a disaster. Not a win either.'],
  },
  rateSleepGreat: {
    mild: ['Great sleep! Make the most of today.'],
    savage: ['Great sleep. Fully charged. That means no excuses today.', 'You slept great. I expect greatness. Or at least water.'],
  },
  sleepRemind: {
    mild: ['How did you sleep? Rate it in S.P.I.D.E.R.'],
    savage: ['Rate your sleep. Be honest. I have your watch data.', 'Morning. How was the night? One tap. Go.'],
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
    savage: ['Low battery. Fine. One quest, gentler roasts, top 3 only. I am being nice. Do not get used to it.'],
  },
  energyOk: {
    mild: ['Normal energy. Normal day. Let us go.'],
    savage: ['Average energy. Average expectations. Surprise me.'],
  },
  energyHigh: {
    mild: ['Full battery! Make the most of it.'],
    savage: ['Full battery. No excuses are available today. Zero.', 'Fully charged. Today the quests fear YOU.'],
  },
  windDownDone: {
    mild: ['Wind-down done. Sleep well! +5 XP'],
    savage: ['Wind-down complete. +5 XP. Now actually sleep. Not "one more game".'],
  },
  windDownRemind: {
    mild: ['Time to wind down for the night.'],
    savage: ['Wind-down time. Screens away. Yes, including this one, after you tick the box.', 'Bedtime routine. Your future self is begging you.'],
  },
  breathDone: {
    mild: ['Nicely done. Breathing: complete.'],
    savage: ['You breathed on purpose. Look at you. Calm and everything.'],
  },
  screenChill: {
    mild: ['{time} on your phone today. Healthy-ish!'],
    savage: ['{time} of phone today. Reasonable. Suspiciously reasonable.', 'Only {time} on the phone? Who are you and where is your TikTok?'],
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
    savage: ['Verdict: tragic, but salvageable.', 'Verdict: the day is a draft. A rough one.'],
  },
  verdictMid: {
    mild: ["You're getting there. Keep going!"],
    savage: ['Verdict: mid. Painfully mid.', 'Verdict: you exist. Bare minimum achieved.'],
  },
  verdictGood: {
    mild: ['Great day so far!'],
    savage: ["Verdict: respectable. Don't get cocky.", 'Verdict: decent. I hate that I said that.'],
  },
  verdictGreat: {
    mild: ['Outstanding! Everything on track.'],
    savage: ['Verdict: suspiciously productive. Are you okay?', 'Verdict: elite. Who replaced you?'],
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
      '{boss} sits on a throne built from your old excuses. Knock it over.',
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
} satisfies Record<string, Pool>;

export type LineKey = keyof typeof LINES;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The savage or the mild list of a pool; the savage level (1–10) sets the odds. */
function pickList(key: LineKey, savageLevel: number) {
  const pool: Pool = LINES[key];
  const savageChance = (clamp(savageLevel, 1, 10) - 1) / 9;
  const savage = pool.savage.length > 0 && (pool.mild.length === 0 || Math.random() < savageChance);
  return { list: savage ? pool.savage : pool.mild, id: `${key}:${savage ? 's' : 'm'}` };
}

export const fillLine = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** A random line. Notifications use this: they're redrawn on every change, so they mustn't use up freshLine's memory. */
export function line(key: LineKey, savageLevel: number, vars: Record<string, string | number> = {}) {
  const { list } = pickList(key, savageLevel);
  return fillLine(list[Math.floor(Math.random() * list.length)], vars);
}

const recent = new Map<string, number[]>(); // pool id -> indexes picked lately, this app run

/** Like line(), but skips the lines it picked most recently from the same pool (half the pool's size). */
export function freshLine(key: LineKey, savageLevel: number, vars: Record<string, string | number> = {}) {
  const { list, id } = pickList(key, savageLevel);
  const seen = recent.get(id) ?? [];
  const choices = list.map((_, i) => i).filter((i) => !seen.includes(i));
  const i = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  const keep = Math.floor(list.length / 2);
  recent.set(id, keep ? [...seen, i].slice(-keep) : []);
  return fillLine(list[i], vars);
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
