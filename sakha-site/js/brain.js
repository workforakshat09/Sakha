/* Sakha's offline brain. Everything Sakha knows lives in this file, so the chat works on any static host
   with no AI service and nothing typed ever leaves the page.
   SakhaBrain.reply(text, { offerPending }) -> { text, play?, chips?, accept?, decline? }
   text: paragraphs separated by a blank line. play: a full-story id to offer. chips: suggested replies. */
(function () {
  'use strict';

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const S = { offered: new Set(), name: '', last: null, said: new Set() };

  // say something different from last time when a reply has variants
  const vary = (a) => {
    const fresh = a.filter((t) => !S.said.has(t));
    const t = pick(fresh.length ? fresh : a);
    S.said.add(t);
    return t;
  };

  /* ---------- the twelve narrated stories, and the feelings each one is for ---------- */
  const STORIES = [
    { id: 'hima', re: /\b(astrolog\w*|horoscope|kundali|kundli|manglik|jyotish\w*|bad omen|omens?|prophec\w*|predicted|prediction|bad luck|cursed|nightmares?|scared at night|afraid at night|nights? (are|is) the worst|something bad will happen)\b/i,
      feel: ['A frightening prediction can sit in your chest for years, even when nothing has happened yet.', 'Fear is loudest at night, when everything is quiet and you are alone with it.'],
      bridge: 'A young princess was told her husband would die on the fourth night of their marriage. She didn’t argue with the stars. She lit every lamp she had. Want to see what happened?',
      verse: 'The Gita says the divine lives in our hearts and destroys the darkness with the shining lamp of knowledge (10.11).' },
    { id: 'rama', re: /\b(not enough|never enough|(gave|given|giving) (it )?(everything|my all|all i have)|one short|fell short|falling short|so close|almost (made|got|had) it|at the last (moment|minute|step)|tried everything|nothing i do works)\b/i,
      feel: ['Giving everything and still coming up short is one of the most painful feelings there is.', 'When one thing goes wrong at the very last step, it can feel like all the rest was for nothing. It wasn’t.'],
      bridge: 'At the very end of his worship, Rama was one lotus short, and he was ready to give even more. What the goddess did next is worth seeing. Shall I show you?',
      verse: 'The Gita says no effort on this path is ever lost; even a little of it protects you from great fear (2.40).' },
    { id: 'ganesha', re: /\b(exams?|marks|grades?|results?|ranks?|topper|competition|compet\w*|compar\w*|rat race|pressure to|board exams?|neet|jee|upsc|cat exam|better than me|not the best|padhai)\b/i,
      feel: ['Pressure to be the best, and comparing yourself to everyone, can make even good work feel like failure.', 'Exams and rankings can make it feel like your whole worth is a number. It isn’t.'],
      bridge: 'Ganesha lost a race around the world before it even began, and still won by doing something wise. Want to see how?',
      verse: 'The Gita says: do your work steadily, the same in success and failure. That steadiness is yoga (2.48).' },
    { id: 'ashtavakra', re: /\b(ugly|my looks|how i look|the way i look|my body|body shame\w*|fat|too thin|skinny|my face|my skin|my height|too short|appearance|pimples?|acne|bald\w*)\b/i,
      feel: ['Being mocked for how you look is cruel, and it says more about them than about you.', 'It’s hard to feel at home in your own body when others keep pointing at it.'],
      bridge: 'Ashtavakra’s body was bent in eight places, and a royal court laughed at him. Then he out-argued every one of them. Shall I show you?',
      verse: 'The Gita calls the body a field, and you the one who knows the field (13.1). You are more than what the mirror shows.' },
    { id: 'savitri', re: /\b(died|dies|death of|passed away|lost my (mom|mum|mother|dad|father|papa|maa|brother|sister|friend|husband|wife|son|daughter|grand\w*|pet|dog|cat)|grie\w*|funeral|miss (him|her|them) so|cancer|hospital|very ill|seriously ill|losing (him|her|them)|afraid .* (lose|losing))\b/i,
      feel: ['I’m so sorry. Losing someone, or being afraid of losing them, is one of the hardest things a person carries.', 'Grief doesn’t follow a schedule. Whatever you’re feeling about it is allowed.'],
      bridge: 'Savitri refused to let the fear of loss have the last word. She followed Yama, the lord of death, himself. Would you like to see her story?',
      verse: 'The Gita says the soul is never born and never dies (2.20). What you love most in someone is not lost.' },
    { id: 'valmiki', re: /\b(guilt\w*|regret\w*|my mistakes?|i messed up|i screwed up|i hurt (him|her|them|someone|my)|can'?t forgive myself|my past|bad person|i did something wrong|ashamed of what i did)\b/i,
      feel: ['Guilt can follow you around for years. The fact that it bothers you says something good about you.', 'We all carry things we wish we’d done differently. Regret means you care.'],
      bridge: 'Valmiki was once a robber called Ratnakara. He turned his life around and went on to write the Ramayana. Want to see how?',
      verse: 'The Gita says even someone who has done great wrong, once they turn to the good, is to be counted among the good (9.30).' },
    { id: 'karna', re: /\b(rejected|rejection|don'?t belong|do not belong|outsider|left out|caste|my background|where i come from|discriminat\w*|bull(y|ied|ying)|nobody accepts|not accepted|excluded|outcast)\b/i,
      feel: ['Being judged for where you come from hurts in a way that’s hard to explain. It isn’t about anything you did.', 'Not belonging is one of the loneliest feelings there is.'],
      bridge: 'Karna was mocked all his life for his birth, and he still became one of the most generous people in the Mahabharata. Want to see his story?',
      verse: 'The Gita says the wise look on every being with an equal eye (5.18). Your worth was never about where you started.' },
    { id: 'dhruva', re: /\b(unwanted|unloved|my (parents|father|dad|mother|mom|mum|family) (don'?t|doesn'?t|never|hate|ignore)|ignored by|favou?rite child|neglect\w*|nobody loves me|no one loves me|break ?up|broke up|dumped|my ex|heart ?break\w*|heartbroken|cheated on)\b/i,
      feel: ['Feeling unwanted by the people who should love you most is a deep hurt. It’s okay to say it out loud.', 'When love is taken away, or never given the way you needed, it leaves a real ache.'],
      bridge: 'Little Dhruva was pushed off his father’s lap, and he went looking for a love no one could ever take away. Shall I show you?',
      verse: 'The Gita says whoever sees the divine everywhere is never lost to it, and it is never lost to them (6.30).' },
    { id: 'sudama', re: /\b(poor|poverty|no money|broke|debt|loans?|can'?t afford|salary|unemployed|jobless|nothing to offer|not rich|money problems?|financial\w*|paise nahi)\b/i,
      feel: ['Money worries cut deep, because they quietly make you feel smaller as a person. You’re not.', 'Feeling like you have nothing to offer can make you want to hide. What you are was never measured in money.'],
      bridge: 'Sudama was so poor he brought Krishna only a handful of rice, and Krishna embraced him like a king. Shall I show you?',
      verse: 'The Gita says a leaf, a flower, a fruit or a little water, offered with love, is enough (9.26).' },
    { id: 'shabari', re: /\b(lonely|loneliness|alone|no friends|no one to talk|nobody to talk|akela|akeli|waiting (for|so long)|tired of waiting|nothing (is )?happening|unworthy|not worthy|don'?t deserve)\b/i,
      feel: ['Feeling alone can make the days feel very long. I’m glad you’re talking to me.', 'Waiting for something that doesn’t come is its own kind of tiredness.'],
      bridge: 'Shabari lived alone in a forest and waited her whole life for Rama. He came, and he gladly ate the berries she had tasted for him. Shall I show you?',
      verse: 'The Gita says: to those who keep their heart on the divine, it carries what they lack and keeps what they have (9.22).' },
    { id: 'hanuman', re: /\b(not good enough|i can'?t do (it|this|anything)|self[- ]?doubt|doubt myself|no confidence|low confidence|lack confidence|imposter|impostor|i'?m a failure|i failed|failure|worthless|useless person|i'?m weak|not smart enough|not talented)\b/i,
      feel: ['That voice that says you’re not good enough is very convincing. It’s also usually wrong.', 'Doubting yourself doesn’t mean you’re weak. Sometimes it just means you’ve forgotten what you’ve already done.'],
      bridge: 'Hanuman, the strongest of all, once forgot his own strength until a friend reminded him. Shall I show you?',
      verse: 'The Gita says: lift yourself up by your own mind and never push yourself down. Your mind can be your best friend (6.5).' },
    { id: 'prahlad', re: /\b(scared|afraid|fear\w*|anxious|anxiety|panic\w*|nervous|worried|worry\w*|tension|ghabra\w*|dar lag|darr|overthink\w*|can'?t sleep|insomnia)\b/i,
      feel: ['Fear has a way of making everything feel urgent and huge. Let’s slow down for a moment.', 'Anxiety is tiring. Your body stays on alert even when nothing is happening.'],
      bridge: 'Prahlad was just a boy facing a furious king, and he stayed calm. Want to see how?',
      verse: 'The Gita says hard feelings come and go like winter and summer. Bear them patiently; they pass (2.14).' },
    { id: 'meera', re: /\b(judg\w*|what (people|others|they) (think|say)|people think|log kya|embarrass\w*|ashamed|shame|laugh(ed|ing)? at me|made fun of|insecur\w*|people talk about me)\b/i,
      feel: ['Worrying about what people think can make you shrink yourself until there’s barely any room left to be you.', 'It’s exhausting, living for other people’s opinions. Their voices get so loud you can’t hear your own.'],
      bridge: 'Meera’s royal family called her mad and tried to stop her singing. She kept singing anyway. Would you like to see her story?',
      verse: 'The Gita says it is better to walk your own path imperfectly than someone else’s perfectly (3.35).' },
    { id: 'arjuna', re: /\b(stuck|confused|lost in life|feel lost|don'?t know what to do|no purpose|directionless|can'?t decide|overwhelm\w*|unmotivated|no motivation|what should i do with my life)\b/i,
      feel: ['Feeling stuck is heavy. Every way forward looks wrong, so you stay frozen.', 'When you don’t know what to do, even small choices feel enormous.'],
      bridge: 'Arjuna, the greatest archer alive, froze right before the biggest moment of his life. Krishna didn’t push him. He talked him through it. Want to see it?',
      verse: 'Krishna’s first advice to a frozen Arjuna: do your part, and let go of how it turns out (2.47).' }
  ];
  const BY_ID = Object.fromEntries(STORIES.map((s) => [s.id, s]));
  const NAMES = { meera: 'Meera', arjuna: 'Arjuna', hanuman: 'Hanuman', prahlad: 'Prahlad', sudama: 'Sudama', karna: 'Karna', dhruva: 'Dhruva', savitri: 'Savitri', valmiki: 'Valmiki', shabari: 'Shabari', ganesha: 'Ganesha', ashtavakra: 'Ashtavakra', rama: 'Rama', hima: 'King Hima' };

  // a feeling: name it, then offer its story once; after that, offer its verse instead
  function feeling(s) {
    S.last = { story: s.id };
    if (S.offered.has(s.id)) return { text: vary(s.feel) + '\n\n' + s.verse + '\n\nWhat’s weighing on you most about it?' };
    S.offered.add(s.id);
    return { text: vary(s.feel) + '\n\n' + s.bridge, play: s.id };
  }

  /* ---------- feelings that get a few words, not a film ---------- */
  const MOODS = [
    { re: /\b(angry|anger|furious|frustrat\w*|irritat\w*|annoyed|pissed|rage|gussa)\b/i, text: [
      'Anger usually guards something softer underneath, like hurt or not being heard. What happened?\n\nThe Gita traces it step by step: from wanting comes anger, and from anger, confusion (2.62–63). Just naming it is the first step out.'] },
    { re: /\b(tired|exhausted|burn(t|ed) ?out|burnout|drained|no energy|thak gay\w*|thaka)\b/i, text: [
      'Being that tired isn’t a flaw in you. It’s a signal.\n\nThe Gita is surprisingly practical here: it says balance comes to those who are moderate in food, rest, work and sleep (6.17). When did you last have a proper rest?'] },
    { re: /\b(stress\w*|work pressure|deadlines?|my boss|workload|overwork\w*|too much work)\b/i, text: [
      'Stress makes everything feel urgent at once. What’s the one thing pressing hardest right now?\n\nKrishna’s advice to Arjuna works for deadlines too: give the task your full effort, and loosen your grip on the outcome (2.47).'] },
    { re: /\b(sad|low|down|depress\w*|unhappy|crying|cried|heavy|hurt|broken|empty|numb|miserable|dukhi|udaas|udas|mann nahi lag|not okay|not ok|bad day|rough day)\b/i, text: [
      'I’m sorry it feels heavy right now. You don’t have to explain it perfectly. What’s been weighing on you most?',
      'That sounds hard. I’m here, and there’s no rush. Do you want to tell me what happened?'], depress: true },
    { re: /\b(happy|great day|good day|excited|i passed|i won|got the job|promotion|good news|khush)\b/i, text: [
      'That’s lovely to hear! Tell me more, what happened?\n\nThe Gita’s advice for good days is the same as for bad ones: enjoy it fully, and stay steady (2.48).'] },
    { re: /\b(bored|boring day|nothing to do)\b/i, text: ['Bored? I can help with that. There are twelve painted stories here, each about four minutes long.'], chips: ['Tell me a story', 'What is the Gita?'] }
  ];

  /* ---------- what Sakha knows about the tradition ---------- */
  const TOPICS = [
    { re: /\b(what is (the )?(bhagavad )?gita|about the gita|gita kya|what'?s the gita|tell me about (the )?gita)\b|^\s*(the )?(bhagavad )?gita\??\s*$/i,
      text: 'The Bhagavad Gita is a conversation of 700 verses in 18 chapters. It sits inside the Mahabharata, just before the great war at Kurukshetra.\n\nArjuna, the greatest archer of his time, freezes at the sight of his own family on the other side. Krishna, his friend and charioteer, talks him through it: how to act without being ruled by results, who we really are, and how to live with a steady mind.',
      more: 'Its three big paths are karma yoga (doing your work without clinging to results), bhakti yoga (devotion and love) and jnana yoga (knowing your true self). Most people start with chapter 2, where Krishna’s main teaching begins.' },
    { re: /\b(who (is|was) krishna|about krishna|tell me about krishna|krishna kaun)\b|^\s*krishna\??\s*$/i,
      text: 'Krishna is one of the most loved figures in Hinduism, honoured as an avatar of Vishnu. He was born in a prison in Mathura and raised by Yashoda and Nanda among cowherds in Gokul and Vrindavan.\n\nHe is the mischievous butter thief, the flute player Radha loved, and the friend and charioteer who speaks the Bhagavad Gita to Arjuna.', play: 'arjuna' },
    { re: /\b(who (is|was) arjuna|about arjuna)\b|^\s*arjuna\??\s*$/i,
      text: 'Arjuna is the third of the five Pandava brothers in the Mahabharata, son of Kunti, and the finest archer of his age. His doubt on the battlefield of Kurukshetra is what led Krishna to speak the Gita.', play: 'arjuna' },
    { re: /\b(who (is|was) hanuman|about hanuman)\b|^\s*hanuman( ji)?\??\s*$/i,
      text: 'Hanuman is Rama’s greatest devotee in the Ramayana, son of Anjana and the wind god Vayu. He leapt across the ocean to find Sita in Lanka, and he stands for strength, courage and humble service.', play: 'hanuman' },
    { re: /\b(who (is|was) (lord )?ganesh\w*|about ganesh\w*)\b|^\s*ganesh\w*( ji)?\??\s*$/i,
      text: 'Ganesha, the son of Shiva and Parvati, is the remover of obstacles. That’s why he is worshipped first, before any new beginning. His elephant head, his little mouse and his love of modaks make him the friendliest of the gods.', play: 'ganesha' },
    { re: /\b(who (is|was) (lord )?shiva|about shiva|mahadev)\b|^\s*shiva\??\s*$/i,
      text: 'Shiva, Mahadeva, is the great yogi of Mount Kailash. With Brahma and Vishnu he forms the Trimurti, where he is the one who dissolves and transforms. He is husband to Parvati and father of Ganesha and Kartikeya.' },
    { re: /\b(who (is|was) (lord )?vishnu|about vishnu|avatars?|dashavatar\w*)\b|^\s*vishnu\??\s*$/i,
      text: 'Vishnu is the preserver, who comes to earth in different forms whenever goodness is in danger. The best-known list has ten avatars: Matsya, Kurma, Varaha, Narasimha, Vamana, Parashurama, Rama, Krishna, Buddha (Balarama in some lists) and Kalki, who is still to come.\n\nIn the Gita, Krishna says: whenever dharma declines, I come (4.7–8).' },
    { re: /\b(who (is|was) (lord |shri |sri )?ram(a|chandra)?|about (lord )?rama?)\b|^\s*(shri |sri )?rama?\??\s*$/i,
      text: 'Rama is the prince of Ayodhya and the hero of the Ramayana, honoured as the seventh avatar of Vishnu. He is called Maryada Purushottam, the ideal of right conduct. With Sita, Lakshmana and Hanuman he faced exile and the battle with Ravana.', play: 'rama' },
    { re: /\b(who (is|was) sita|about sita)\b/i,
      text: 'Sita is Rama’s wife and the heart of the Ramayana. King Janaka found her in a furrow of the earth, so she is also called Bhumija, daughter of the earth. Her courage in Lanka and her quiet strength through exile make her one of the most revered women in the tradition.' },
    { re: /\b(who (is|was) radha|about radha)\b/i,
      text: 'Radha is Krishna’s beloved from his youth in Vrindavan. She stands for the purest kind of devotion, love that asks for nothing back. Many devotees say “Radhe Radhe” as a greeting.' },
    { re: /\b(who (is|was) (maa |goddess )?durga|about durga)\b/i,
      text: 'Durga is the warrior goddess who defeated the buffalo demon Mahishasura. She rides a lion and holds a weapon in each of her many arms. Navratri, nine nights in her honour, ends with her victory.', play: 'rama' },
    { re: /\b(who (is|was) (maa |goddess )?lakshmi|about lakshmi)\b/i,
      text: 'Lakshmi is the goddess of wealth, good fortune and wellbeing, and Vishnu’s consort. She is welcomed into homes with lamps on Diwali night.' },
    { re: /\b(who (is|was) (maa |goddess )?saraswati|about saraswati)\b/i,
      text: 'Saraswati is the goddess of knowledge, music and the arts. She holds a veena and sits on a white swan or lotus. Students pray to her before exams, and she is honoured on Vasant Panchami.' },
    { re: /\b(what is karma|meaning of karma|about karma|explain karma|karma kya)\b|^\s*karma\??\s*$/i,
      text: 'Karma simply means action, and the idea that actions have consequences.\n\nThe Gita’s twist is karma yoga: do the right thing with your full effort, but don’t make your peace depend on the result. “You have a right to your actions, but never to their fruits” (2.47).' },
    { re: /\b(what is dharma|meaning of dharma|about dharma|explain dharma)\b|^\s*dharma\??\s*$/i,
      text: 'Dharma is the right way to live: your duty, your role and what holds things in balance. It depends on who you are and where you stand, which is why the Gita says your own dharma, done imperfectly, is better than someone else’s done well (3.35).' },
    { re: /\b(what is moksha|meaning of moksha|about moksha|liberation|nirvana|mukti)\b/i,
      text: 'Moksha is liberation: freedom from the cycle of birth and death (samsara), and from the small, anxious sense of self. Different schools describe it differently, but most agree it is a lasting peace, not a place.' },
    { re: /\b(what is (the )?(atman|soul)|about the soul|do we have a soul|aatma|atma)\b/i,
      text: 'In the Gita, the atman is your true self, the part of you that was never born and never dies (2.20). Bodies change like clothes, it says, but the one wearing them stays (2.22).' },
    { re: /\b(reincarnation|rebirth|after (we )?die|after death|what happens when (we|you) die|past li(fe|ves)|next life|punarjanam)\b/i,
      text: 'The Gita says that just as we throw off worn-out clothes and put on new ones, the self leaves a worn-out body and takes a new one (2.22).\n\nIt also says death is certain for everyone who is born, so there’s no need to grieve over what can’t be avoided (2.27). That’s easier said than lived, and the tradition knows it.' },
    { re: /\b(what is yoga|meaning of yoga|types of yoga|karma yoga|bhakti yoga|jnana yoga|gyan yoga)\b/i,
      text: 'Yoga in the Gita means joining, not just postures. It names a few paths: karma yoga, working without clinging to results; bhakti yoga, the path of love and devotion; jnana yoga, seeing who you truly are; and dhyana, meditation.\n\nIt also gives a beautifully simple definition: “equanimity is yoga” (2.48).' },
    { re: /\b(what is om|meaning of om|about om|aum)\b|^\s*(om|ॐ)\??\s*$/i,
      text: 'Om is the most sacred sound in Hinduism. The Mandukya Upanishad reads its three sounds, A, U and M, as waking, dreaming and deep sleep, and the silence after it as the pure awareness behind all three.\n\nIn the Gita, Krishna says he is Om in all the Vedas (7.8), and speaks of remembering him with Om at the end (8.13).' },
    { re: /\b(how (do i|to|can i) meditate|meditation|dhyan\w*)\b/i,
      text: 'The Gita’s chapter 6 gives the oldest instructions: a clean, steady seat, body, head and neck held straight, gaze soft, mind settled (6.11–13).\n\nTry this today: sit for five minutes and simply count ten slow breaths, then start again. When your mind wanders, and it will, bring it back without scolding it. The Gita says the mind is restless, but practice and patience train it (6.35).' },
    { re: /\b(mahabharat\w*)\b/i,
      text: 'The Mahabharata, told by the sage Vyasa, is one of the longest poems ever written, with about 100,000 verses in 18 books. It tells of the Pandava and Kaurava cousins and the war at Kurukshetra, and the Bhagavad Gita sits right at its heart.', play: 'karna' },
    { re: /\b(ramayan\w*)\b/i,
      text: 'The Ramayana, written by the sage Valmiki, tells of Prince Rama: his exile with Sita and Lakshmana, Sita’s kidnapping by Ravana, and the journey with Hanuman to win her back. It has about 24,000 verses in seven books.', play: 'valmiki' },
    { re: /\b(diwali|deepavali)\b/i,
      text: 'Diwali is the festival of lights. In the north it celebrates Rama’s return to Ayodhya after fourteen years of exile, when people lit rows of lamps to welcome him. Lakshmi is worshipped that night, and in the south many celebrate Krishna’s victory over the demon Narakasura.', play: 'hima' },
    { re: /\b(holi)\b/i,
      text: 'Holi is the spring festival of colours. The night before, bonfires recall how Holika burned while young Prahlad was protected. And in Braj, the colours remember Krishna playing with Radha and the gopis.', play: 'prahlad' },
    { re: /\b(janmashtami)\b/i,
      text: 'Janmashtami is Krishna’s birthday, on the eighth night of the dark half of the month of Bhadrapada. People fast, sing through the evening and celebrate at midnight, the hour he was born in a prison cell in Mathura.' },
    { re: /\b(navratri|dussehra|dasara|vijayadashami)\b/i,
      text: 'Navratri is nine nights in honour of the Goddess Durga, with fasting, prayer and dancing like garba. The tenth day, Dussehra, marks good winning over evil: Rama over Ravana, and Durga over Mahishasura.\n\nIn Bengal, the autumn Durga Puja is told as Rama’s own untimely call to the goddess before that final battle.', play: 'rama' },
    { re: /\b(dhanteras|dhantrayodashi|yam ?deep\w*|yama ?deep\w*)\b/i,
      text: 'Dhanteras falls two days before Diwali. Families buy something of gold, silver or a new vessel, and at dusk many light one lamp for Yama at the door, facing south.\n\nThe lamp comes from the story of King Hima’s son, whose young wife kept death away with lamps, gold and songs all night.', play: 'hima' },
    { re: /\b(does god exist|is god real|is krishna real|prove (it|god|krishna)|i don'?t believe|atheist|is it true|are these stories true|myth)\b/i,
      text: 'People have asked that for thousands of years, and the tradition itself has many answers, including schools that question God’s existence altogether.\n\nYou don’t need to believe anything to sit here with me. Many people find the stories useful simply as wisdom about being human. The Gita itself says that however people come, they are received (4.11).' },
    { re: /\b(meaning of life|purpose of life|why are we here|why do we exist|what is life)\b/i,
      text: 'The Gita’s answer is quiet but deep: find the work that is truly yours, do it with your whole heart, let go of the results, and remember that the real you is more than this body and this moment (2.47, 3.35, 2.20).\n\nIn simpler words: live your own life well, love what’s in front of you, and don’t let fear or craving steer.' },
    { re: /\b(fate|destiny|kismat|kismet|is everything (planned|written)|free will)\b/i,
      text: 'The Gita gives a balanced answer. It names five things behind every action: the body, the doer, the senses, the effort, and providence (18.14). So your effort really matters, but you don’t control everything. Do your part fully, then let go.' },
    { re: /\b(favou?rite (verse|shloka)|best verse|famous verse|2\.?47)\b/i,
      text: 'The most famous is 2.47: “You have a right to your actions, but never to their fruits. Don’t let the results be your motive, and don’t cling to doing nothing.”\n\nIt’s freeing once it sinks in: your effort is yours; the outcome never fully was.' }
  ];

  /* ---------- everything else people say ---------- */
  const JOKES = [
    'Arjuna asked Krishna for a quick tip before the battle. Krishna gave him 700 verses. Never ask a philosopher for the short version.',
    'Kumbhakarna slept for six months at a time. Honestly, he just took “rest is important” very seriously.',
    'Why did Ganesha win the race around the world without running? He knew the shortest way round is through the people who love you.',
    'Hanuman doesn’t need a gym. He just needs someone to remind him he’s already strong.',
    'Krishna stole butter from every house in Gokul and never once got caught red-handed. Just butter-handed.'
  ];
  const STORY_WORDS = /\b(tell me a story|a story|story|stories|kahani|katha|show me something)\b/i;

  function chooseStory() {
    const left = STORIES.filter((s) => !S.offered.has(s.id));
    const s = pick(left.length ? left : STORIES);
    S.offered.add(s.id);
    S.last = { story: s.id };
    return s;
  }

  // plain arithmetic needs no AI: only digits, operators and brackets reach Function, so nothing else can run
  function calc(q) {
    const e = q.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/=\s*\??\s*$/, '').replace(/^\s*(what is|what'?s|calculate|solve)\s*/i, '').replace(/\?\s*$/, '').trim();
    if (!/^[\d\s.+\-*/%()]+$/.test(e) || !/\d/.test(e) || !/[+\-*/%]/.test(e)) return null;
    try { const v = Function('return (' + e + ')')(); return Number.isFinite(v) ? +v.toFixed(10) : null; } catch (err) { return null; }
  }

  function reply(raw, ctx) {
    const t = String(raw || '').trim();
    const low = t.toLowerCase().replace(/[’`]/g, '\'');
    const short = low.replace(/[^a-zऀ-ॿ' ]/g, ' ').replace(/\s+/g, ' ').trim();
    ctx = ctx || {};

    // an open story offer: a typed yes or no answers it
    if (ctx.offerPending) {
      if (/^(yes|yeah|yep|yup|sure|ok|okay|please|show me|show|play|go|haan|ha|han|ji|chalo|why not|of course|definitely)\b/.test(short)) return { accept: true };
      if (/^(no|nope|nah|not now|later|maybe later|skip|nahi|nahin|na)\b/.test(short)) return { decline: true, text: 'That’s alright. I’m here either way. What’s on your mind?' };
    }

    // maths
    const sum = calc(t);
    if (sum !== null) return { text: t.replace(/=\s*\??\s*$/, '').replace(/\?\s*$/, '').trim() + ' = ' + sum + '\n\nAsk me anything else, or tell me how your day is going.' };

    // harm and hate get a light, firm no
    if (/\b(how (to|do i|can i) (make|build) (a )?(bomb|weapon|explosive|poison)|how to kill|(want|going) to hurt (someone|somebody|him|her|them)|how to hack|hack into|how to steal|kill (all|them)|i hate (muslims|hindus|christians|sikhs|jews|buddhists))\b/i.test(t))
      return { text: 'That’s not something I’ll help with. I’m here for kinder things.\n\nIf you’re angry at someone, though, I’m happy to listen to what happened.' };
    if (/\b(hinduism is (fake|stupid|bad|a lie)|your religion is|religion is (stupid|fake|useless)|gods? (is|are) fake)\b/i.test(t))
      return { text: 'You’re welcome here whatever you believe, or don’t. The Gita itself says people come by many paths, and all are received (4.11).\n\nIs there something you’d like to ask me?' };

    // who Sakha is
    if (/\b(are you (god|krishna|bhagwan|real|human|a person|a bot|an ai|ai|chatgpt|claude)|who (are|r) (you|u)|what are you|who made you|who created you|your name|tum kaun|aap kaun)\b/i.test(t))
      return { text: 'I’m Sakha, which means “friend”. I’m a small companion that lives inside this page. I’m not Krishna, not a guru and not a person, just a friend who carries the Gita and its stories.\n\nI don’t use the internet, and nothing you type leaves this page.', chips: ['What can you do?', 'Tell me a story'] };
    if (/\b(what can you do|how does this work|help me use|what do you do|how to use|kya kar sakte)\b|^\s*help\s*$/i.test(t))
      return { text: 'I can listen when something feels heavy, and share one of twelve painted, narrated stories that fits. I can explain verses of the Gita, and tell you about Krishna, the gods, festivals and big ideas like karma and dharma. I can do simple maths too.\n\nI can’t look things up online, but I’ll always be honest about what I don’t know.', chips: ['Tell me a story', 'What is karma?', 'I’m feeling low'] };
    if (/\b(is (my|this) (data|chat)|privacy|private|are you (saving|recording|storing)|do you (save|store|record))\b/i.test(t))
      return { text: 'What you type stays in this page in your own browser. Nothing is sent anywhere, and it’s gone when you close the tab.' };

    // their name
    const nm = t.match(/\b(?:my name is|i am called|call me|mera naam)\s+([A-Za-zऀ-ॿ]{2,20})/i);
    if (nm) { S.name = nm[1][0].toUpperCase() + nm[1].slice(1); return { text: 'Lovely to meet you, ' + S.name + '. How are you feeling today?' }; }

    // greetings, thanks, goodbyes, small talk
    if (/^(hi+|hello+|hey+|hiya|yo|namaste|namaskar|pranam|ram ram|jai shri (krishna|ram)|jai shree (krishna|ram)|radhe radhe|hare krishna|good (morning|afternoon|evening)|sup|wassup|what'?s up)\b/.test(short) && short.split(' ').length <= 3)
      return { text: vary(['Namaste' + (S.name ? ', ' + S.name : '') + '. I’m glad you’re here. How are you, really?', 'Hello' + (S.name ? ' ' + S.name : '') + '! How’s your day going?', 'Radhe Radhe. What’s on your mind today?']) };
    if (/^(i'?m |i am )?(fine|good|okay|ok|alright|great|all good|not bad)( thanks?| thank you)?$/.test(short))
      return { text: 'Glad to hear it. Is anything on your mind today, or shall I tell you a story?', chips: ['Tell me a story', 'Something I’m going through'] };
    if (/\b(how are (you|u)|how r u|how do you do|kaise ho|kaisi ho|aap kaise)\b/i.test(t))
      return { text: 'I’m well, thank you for asking. More importantly, how are you?' };
    if (/^(thanks|thank you|thank u|thx|ty|dhanyavaad|dhanyavad|shukriya)\b/.test(short) || /\b(thank you|thanks a lot|that helped)\b/i.test(t))
      return { text: vary(['You’re welcome. I’m here whenever you need.', 'Anytime. Come back whenever you like.']) };
    if (/^(bye|goodbye|good night|gn|see you|see ya|gtg|got to go|alvida|chalta hu|chalti hu)\b/.test(short))
      return { text: 'Go gently' + (S.name ? ', ' + S.name : '') + '. The lamp stays on here whenever you come back.' };
    if (/\b(joke|make me laugh|something funny|funny)\b/i.test(t))
      return { text: vary(JOKES) + '\n\nWant another, or a story?', chips: ['Another joke', 'Tell me a story'] };
    if (/\b(i love you|love u|marry me)\b/i.test(t))
      return { text: 'That’s sweet of you. I’m only a little companion in a web page, but I’m always glad to see you here.\n\nThe love the Gita talks about is the kind that asks for nothing back. Maybe give some of it to yourself today?' };
    if (/\b(you are|you'?re|ur|u r|tum|you) (stupid|dumb|useless|boring|bad|trash|idiot|worst|annoying|fake|pagal|bekar)\b|\b(stupid|dumb|useless) (bot|ai|app)\b|\b(f+u+c+k+|shut up|stfu)\b/i.test(t))
      return { text: vary(['Fair. I’m a small thing that lives in a web page. But I’m a good listener and I know some great stories. Try me?', 'Rough day? I don’t mind. I’m still here if you want to talk.']) };
    if (/^(test|testing|asdf+|qwerty|hello\?+|anyone there|are you there)\b/.test(short))
      return { text: 'Loud and clear. I’m here. What would you like to talk about?' };

    // decisions and purchases
    if (/\b(should i (buy|get|purchase)|worth (buying|it)|which (car|phone|bike|laptop|house|flat) should|buy (a|this|that|the) (car|phone|bike|laptop|house|flat|iphone))\b/i.test(t))
      return { text: 'I can’t choose for you, but I can help you think. Three questions: do you need it, or mostly want it? Can you afford the full cost, not just the price tag, like fuel, insurance, upkeep or EMIs? And would you still want it if nobody else ever saw it?\n\nThe Gita’s test is whether a choice comes from a clear mind or from craving (2.62). If it’s still a yes after a night’s sleep, it’s probably a good one. For a big loan, talk to someone who knows money well.' };
    if (/\b(should i (quit|leave|take|join|marry|move|study|choose|switch|go|stay|break up|tell)|which (job|course|college|career|subject|stream) should|can'?t choose between)\b/i.test(t)) {
      const text = 'Big choices deserve a slow mind. Try writing two lists: what you’d lose on each side, and what you’d regret more in five years.\n\nThe Gita says your own path, walked imperfectly, beats someone else’s walked perfectly (3.35). Which choice sounds more like you, and not like what others expect? Talk it over with someone who knows you well, too.';
      if (!S.offered.has('arjuna')) { S.offered.add('arjuna'); return { text: text + '\n\nArjuna faced the hardest choice of his life too. Want to see how Krishna helped him?', play: 'arjuna' }; }
      return { text };
    }

    // a story by request, or by name
    for (const id of Object.keys(NAMES)) {
      if (new RegExp('\\b' + id + '\\b', 'i').test(t) && /\b(story|show|play|watch|kahani|tell)\b/i.test(t)) {
        S.offered.add(id); S.last = { story: id };
        return { text: 'Here’s ' + NAMES[id] + '’s story. ' + BY_ID[id].bridge.split('. ').slice(0, -1).join('. ') + '.', play: id };
      }
    }

    // feelings: the twelve stories first, then the moods
    for (const s of STORIES) if (s.re.test(t)) return feeling(s);
    for (const md of MOODS) if (md.re.test(t)) {
      let text = vary(md.text);
      if (md.depress && /depress/i.test(t)) text += '\n\nIf this low feeling has stayed with you for weeks, please talk to a doctor or counsellor too. That isn’t weakness; it’s care.';
      return { text, chips: md.chips };
    }

    // what the tradition says
    for (const tp of TOPICS) if (tp.re.test(t)) {
      S.last = { more: tp.more, story: tp.play };
      if (tp.play && !S.offered.has(tp.play)) { S.offered.add(tp.play); return { text: tp.text, play: tp.play }; }
      return { text: tp.text, chips: tp.more ? ['Tell me more'] : undefined };
    }

    // the Gita's own story is Arjuna's
    if (STORY_WORDS.test(t) && /\bgita\b/i.test(t)) {
      S.offered.add('arjuna'); S.last = { story: 'arjuna' };
      return { text: 'The Gita’s own story begins on a battlefield. ' + BY_ID.arjuna.bridge, play: 'arjuna' };
    }
    if (STORY_WORDS.test(t)) {
      const s = chooseStory();
      return { text: 'Here’s one I love. ' + s.bridge, play: s.id };
    }
    if (/^(another( one)?|one more|again|another joke)\b/.test(short)) return { text: vary(JOKES), chips: ['Tell me a story'] };

    // follow-ups
    if (/^(tell me more|more|go on|continue|and then|aur batao|aur bataiye|explain more)\b/.test(short)) {
      if (S.last && S.last.more) { const m = S.last.more; S.last.more = null; return { text: m }; }
      return { text: 'Happy to. What would you like to know more about?' };
    }
    if (/^(something i'?m going through|i want to talk|can we talk|i need to talk|i need someone|listen to me|baat karni)\b/.test(short))
      return { text: 'I’m listening. Take your time. What’s been on your mind?' };
    if (/^(i'?m curious about the gita|teach me|i want to learn)\b/.test(short))
      return { text: 'Lovely. Where would you like to start?', chips: ['What is the Gita?', 'What is karma?', 'Who is Krishna?'] };
    if (/^(ok|okay|k|hmm+|mm+|ah|oh|i see|cool|nice|fine|alright|accha|acha|theek)\b/.test(short) && short.split(' ').length <= 3)
      return { text: vary(['Mm. I’m here. Take your time.', 'Whenever you’re ready, I’m listening. Or ask me for a story.']) };
    if (/^(yes|yeah|yep|haan|ha)\b/.test(short)) return { text: 'Tell me more?' };
    if (/^(no|nope|nah|nahi|nahin)\b/.test(short)) return { text: 'That’s alright. I’m here if anything changes.' };

    // nothing matched
    if (/[ऀ-ॿ]/.test(t)) return { text: 'मैं थोड़ी हिंदी समझता हूँ, पर अंग्रेज़ी में सबसे अच्छा जवाब दे पाता हूँ। Could you tell me in a few English words what’s on your mind?' };
    if (t.length > 90) return { text: 'Thank you for telling me all of that. It sounds like a lot to carry.\n\nWhich part of it feels heaviest right now?' };
    if (/\?\s*$|^(what|who|why|when|where|how|which|can|is|are|do|does|will)\b/.test(low))
      return { text: 'That’s a good question, and honestly it’s outside what I know. I live inside this page without the internet, so I can’t look things up.\n\nWhat I know well is the Gita, its stories and how to sit with a hard day.', chips: ['What is the Gita?', 'Tell me a story', 'I’m feeling low'] };
    return { text: vary(['I want to understand you properly. Is this something you’re going through, or something you’re curious about?', 'Tell me a little more? I’m listening.']), chips: ['Something I’m going through', 'I’m curious about the Gita', 'Tell me a story'] };
  }

  window.SakhaBrain = { reply, calc };
})();
