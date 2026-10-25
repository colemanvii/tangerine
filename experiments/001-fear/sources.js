/*
 * Collection 001 — Fear.
 *
 * Every passage with kind 'quotation' was copied from a public-domain text and
 * checked word for word against the file named in `checked` (October 2026).
 * kind 'paraphrase' marks a summary of a source; it is never the author's words.
 * `commentary` is Haven's interpretation: written for this prototype, shown
 * apart from the sources, and optional.
 */
window.FEAR = (function () {
  const KJV = 'King James Version (1611)';
  const KJV_RIGHTS = 'Public domain';
  const KJV_CHECKED = 'Project Gutenberg #10 (GitHub mirror)';
  const bg = (ref) => ({ url: 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=KJV', label: 'Read the chapter' });

  const SENECA = { author: 'Seneca', translation: 'tr. Richard M. Gummere (Loeb, 1917)', rights: 'Public domain in the US', checked: 'Standard Ebooks edition of Gummere (CC0)' };
  const MARCUS = { author: 'Marcus Aurelius', work: 'Meditations', translation: 'tr. George Long (1862)', rights: 'Public domain', read: { url: 'https://www.gutenberg.org/ebooks/15877', label: 'Read the Long translation' }, checked: 'Project Gutenberg #15877 (GitHub mirror)' };

  return {
    questionHTML: 'What is fear, and how should a person <em>live in relation to it?</em>',

    opening: [
      'This collection does not try to cure fear. It gathers people who looked at it closely, in scripture, philosophy, novels and prayer, and leaves room beside each of them for you.',
      'Two threads run through it. One is the old distinction between the fear that is reverence, the beginning of wisdom, and the fear that makes a person bury what was given to them. The other is the slower question of what fear is: an event in the world, or a judgement, a rehearsal, a dizziness before one’s own freedom.',
      'Read slowly. Collect what holds you. Write in the margin. Come back.',
    ],

    closing: 'That is the whole collection for now. What matters next is not another passage but what you make of these: a sentence kept, a question written down, an earlier thought found again.',

    about: 'Collection 001 is a reading of about twenty minutes in six movements: thirty-two passages, mostly public-domain texts quoted exactly, with a few paraphrases where a reliable or public-domain text could not be checked. It is a prototype. Nothing of yours has been imported into it.',

    demoPassage: 'mt-25-25',

    prompts: [
      'What are you afraid of that is also asking something of you?',
      'Is there a fear you are meant to keep?',
      'What have you buried because you were afraid?',
      'What are you suffering in imagination that has not happened?',
      'If this were your last year, which fear would you stop obeying?',
      'Where have you been met, when you expected to be alone?',
    ],

    method: [
      'Every quotation here was copied from a public-domain edition and checked word for word against a copy of that edition: Project Gutenberg texts for the King James Version, George Long’s Marcus Aurelius, Higginson’s Epictetus, Cotton’s Montaigne, Garnett’s and Martin’s Dostoevsky, Crane, Shakespeare and Julian of Norwich; Standard Ebooks texts for Gummere’s Seneca, Peters’s Aristotle and Hemingway. Spelling and punctuation follow the edition, including older forms such as “thee” and “judgment”. Plain quotation marks and double hyphens are set as typographic quotes and dashes. An ellipsis (…) marks omitted words.',
      'Each passage is labeled. A quotation is the author’s words in the named translation. A paraphrase is a summary and never the author’s words. Commentary is Haven’s interpretation: written for this prototype, kept beside the sources rather than among them, and hidden with one control.',
      'Links go to the full text wherever a public-domain edition exists, so a passage can be read in its context rather than as an excerpt.',
      'Some voices the collection wanted are paraphrased rather than quoted. Thomas Merton and the English translations of Kierkegaard are under copyright, and Tolstoy’s Maude translation could not be reached to check during this session. A paraphrase is more honest than a remembered quotation.',
      'Copyright: the texts quoted are in the public domain in the United States. A Farewell to Arms (1929) entered the US public domain in 2025 and may still be under copyright elsewhere.',
    ],

    excluded: [
      { title: '“It is not death that a man should fear, but he should fear never beginning to live.”', note: 'Widely attributed to Marcus Aurelius. It does not appear in Long’s translation; it is a modern paraphrase of Meditations XII.1, which is quoted here as Long wrote it.' },
      { title: '“Courage is grace under pressure.”', note: 'A common misquotation of Hemingway. The phrase “grace under pressure” is reported from a 1926 letter and Dorothy Parker’s 1929 New Yorker profile, which says he was defining “guts”, not courage. Neither source was checked directly, so it is left out.' },
      { title: 'Dostoevsky’s letter of 22 December 1849', note: 'Written to his brother after the mock execution. The familiar wording (“Life is a gift…”) comes from a later translation, and translations differ. Until the 1914 Mayne translation is checked, the collection uses Prince Myshkin’s account in The Idiot instead.' },
      { title: 'Aristotle in W. D. Ross’s translation', note: 'The Ross text could not be reached for checking. F. H. Peters’s 1906 translation, which was checked, is used instead.' },
      { title: 'Tolstoy, Merton and Kierkegaard in their own words', note: 'Paraphrased for now. They are labeled paraphrases with full citations, so you can find the original passages.' },
    ],

    movements: [
      {
        id: 'two-fears', numeral: 'I', short: 'Two kinds of fear', title: 'Two kinds of fear',
        commentary: 'Scripture uses one English word for two different things. One fear is reverence: awe before what is greater than oneself, which steadies a life. The other is the fear that shrinks a life and stops it from acting faithfully. Holding them apart is the work of this first movement.',
        passages: [
          { id: 'prov-9-10', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Proverbs', work: '', locator: 'Proverbs 9:10', translation: KJV, rights: KJV_RIGHTS, read: bg('Proverbs 9'), checked: KJV_CHECKED,
            text: 'The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.',
            themes: ['reverence'], keywords: 'awe wisdom beginning',
            commentary: ['The Hebrew is yirʾat YHWH. It is closer to reverence or awe than to fright. In Proverbs it is a beginning, a posture from which wisdom starts, not a feeling to be got over.'] },
          { id: 'eccl-12-13', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Ecclesiastes', work: '', locator: 'Ecclesiastes 12:13', translation: KJV, rights: KJV_RIGHTS, read: bg('Ecclesiastes 12'), checked: KJV_CHECKED,
            text: 'Let us hear the conclusion of the whole matter: Fear God, and keep his commandments: for this is the whole duty of man.',
            themes: ['reverence'], keywords: 'keep duty',
            commentary: ['After a whole book of doubt about work, pleasure and wisdom, the Preacher ends with this kind of fear. It is the fear he decides to keep.'] },
          { id: 'mt-10-28', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Matthew', work: '', locator: 'Matthew 10:28', translation: KJV, rights: KJV_RIGHTS, read: bg('Matthew 10'), checked: KJV_CHECKED,
            text: 'And fear not them which kill the body, but are not able to kill the soul: but rather fear him which is able to destroy both soul and body in hell.',
            themes: ['reverence', 'death'], keywords: 'soul body',
            commentary: ['Jesus does not abolish fear here. He reorders it. The disciples, sent out into hostility, are given a greater fear so that the lesser one loses its hold.'] },
          { id: '2tim-1-7', tradition: 'scripture', kind: 'quotation', verse: true, author: '2 Timothy', work: '', locator: '2 Timothy 1:7', translation: KJV, rights: KJV_RIGHTS, read: bg('2 Timothy 1'), checked: KJV_CHECKED,
            text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.',
            themes: ['love', 'courage'], keywords: 'timid timidity power gift',
            commentary: ['The Greek word here is deilia, timidity or cowardice. It is not the reverent fear of Proverbs. The letter sets it against power, love and self-control, three things that make action possible.'] },
          { id: 'mt-25-25', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Matthew', work: '', locator: 'Matthew 25:25', translation: KJV, rights: KJV_RIGHTS, read: bg('Matthew 25'), checked: KJV_CHECKED,
            text: 'And I was afraid, and went and hid thy talent in the earth: lo, there thou hast that is thine.',
            themes: ['withholding'], keywords: 'buried hidden caution kept safe unused gift',
            commentary: [
              'In the parable of the talents, two servants put what they were given to work. The third buries it. His reason is the most honest sentence in the story: I was afraid.',
              'Nothing is lost, and yet he is the one rebuked. This is the second kind of fear, the kind that looks like prudence and ends in a life kept safe and unused.',
            ] },
          { id: '1jn-4-18', tradition: 'scripture', kind: 'quotation', verse: true, author: '1 John', work: '', locator: '1 John 4:18', translation: KJV, rights: KJV_RIGHTS, read: bg('1 John 4'), checked: KJV_CHECKED,
            text: 'There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love.',
            themes: ['love'], keywords: 'torment',
            commentary: ['Not courage but love is what drives fear out. This is a different answer from the philosophers’ answers in movement III.'] },
        ],
      },

      {
        id: 'fear-not', numeral: 'II', short: 'Fear not', title: 'Fear not',
        commentary: '“Fear not” in scripture is rarely a bare command to feel differently. Almost always a reason follows: a presence, a promise, a reminder of what has been provided. These are reassurances, not instructions to be braver.',
        passages: [
          { id: 'isa-41-10', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Isaiah', work: '', locator: 'Isaiah 41:10', translation: KJV, rights: KJV_RIGHTS, read: bg('Isaiah 41'), checked: KJV_CHECKED,
            text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
            themes: ['trust'], keywords: 'alone help strengthen',
            commentary: ['The reason comes straight after the command: for I am with thee. The verse is spoken to a people in exile. It does not say there is nothing to fear. It says they will not face it alone.'] },
          { id: 'ps-27', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Psalm 27', work: '', locator: 'Psalm 27:1, 3', translation: KJV, rights: KJV_RIGHTS, read: bg('Psalm 27'), checked: KJV_CHECKED,
            verses: [['1', 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?'], ['3', 'Though an host should encamp against me, my heart shall not fear: though war should rise against me, in this will I be confident.']],
            themes: ['trust', 'courage'], keywords: 'confident war',
            commentary: ['The psalm asks questions instead of giving orders. Whom shall I fear? It does not deny the army. It sets the army beside something larger.'] },
          { id: 'josh-1-9', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Joshua', work: '', locator: 'Joshua 1:9', translation: KJV, rights: KJV_RIGHTS, read: bg('Joshua 1'), checked: KJV_CHECKED,
            text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
            themes: ['courage', 'trust'], keywords: 'begin task successor',
            commentary: ['Moses has just died, and Joshua must lead a people into land he has never held. The courage asked of him is for a task he did not choose and must now begin.'] },
          { id: 'mt-6', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Matthew', work: '', locator: 'Matthew 6:25, 27–28, 34', translation: KJV, rights: KJV_RIGHTS, read: bg('Matthew 6:25-34'), checked: KJV_CHECKED,
            verses: [
              ['25', 'Therefore I say unto you, Take no thought for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than meat, and the body than raiment?'],
              ['27', 'Which of you by taking thought can add one cubit unto his stature?'],
              ['28', 'And why take ye thought for raiment? Consider the lilies of the field, how they grow; they toil not, neither do they spin:'],
              ['34', 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.'],
            ],
            themes: ['tomorrow', 'trust'], keywords: 'worry anxious anxiety future',
            commentary: ['“Take no thought” is the King James way of saying do not be anxious. The Greek verb means to be pulled in different directions. Matthew 6:34 limits worry to today. It does not say tomorrow will be easy, only that it is not yet yours to carry.'] },
        ],
      },

      {
        id: 'imagination', numeral: 'III', short: 'In imagination', title: 'We suffer more in imagination',
        commentary: 'The Stoics move fear indoors. What frightens us, they argue, is largely a judgement about events and a rehearsal of events that have not happened. That means some of it is ours to examine.',
        passages: [
          Object.assign({ id: 'seneca-13', tradition: 'philosophy', kind: 'quotation', work: 'Moral Letters to Lucilius', locator: 'Letter XIII, “On Groundless Fears”', read: { url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13', label: 'Read Letter XIII' },
            text: 'There are more things, Lucilius, likely to frighten us than there are to crush us; we suffer more often in imagination than in reality. …\n\n… What I advise you to do is, not to be unhappy before the crisis comes; since it may be that the dangers before which you paled as if they were threatening you, will never come upon you; they certainly have not yet come.',
            themes: ['tomorrow'], keywords: 'imagined rehearsing awake night crisis',
            commentary: ['Seneca wrote these letters to a younger friend in his last years, under Nero, who later ordered his death. The advice is not that danger is unreal. It is that we start suffering too early.'] }, SENECA),
          Object.assign({ id: 'seneca-13b', tradition: 'philosophy', kind: 'quotation', work: 'Moral Letters to Lucilius', locator: 'Letter XIII', read: { url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13', label: 'Read Letter XIII' },
            text: 'How often has the unexpected happened! How often has the expected never come to pass!',
            themes: ['tomorrow'], keywords: 'expected unexpected' }, SENECA),
          Object.assign({ id: 'seneca-5', tradition: 'philosophy', kind: 'quotation', work: 'Moral Letters to Lucilius', locator: 'Letter V, “The Philosopher’s Mean”', read: { url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_5', label: 'Read Letter V' },
            text: 'I find in the writings of our Hecato that the limiting of desires helps also to cure fears: “Cease to hope,” he says, “and you will cease to fear.”',
            themes: ['tomorrow'], keywords: 'hope desire',
            commentary: ['Hecato of Rhodes was an earlier Stoic. The pairing is unsettling: hope and fear both lean into a future we do not hold. Set this beside Psalm 27, where hope has an object.'] }, SENECA),
          Object.assign({ id: 'seneca-24', tradition: 'philosophy', kind: 'quotation', work: 'Moral Letters to Lucilius', locator: 'Letter XXIV, “On Despising Death”', read: { url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_24', label: 'Read Letter XXIV' },
            text: 'It is indeed foolish to be unhappy now because you may be unhappy at some future time.',
            themes: ['tomorrow'], keywords: 'future unhappy now' }, SENECA),
          { id: 'epictetus-5', tradition: 'philosophy', kind: 'quotation', author: 'Epictetus', work: 'Enchiridion', locator: '§5', translation: 'tr. Thomas Wentworth Higginson (1865)', rights: 'Public domain', read: { url: 'https://www.gutenberg.org/ebooks/45109', label: 'Read the Enchiridion' }, checked: 'Project Gutenberg #45109 (GitHub mirror)',
            text: 'Men are disturbed not by things, but by the views which they take of things. Thus death is nothing terrible, else it would have appeared so to Socrates. But the terror consists in our notion of death, that it is terrible.',
            themes: ['judgement', 'death'], keywords: 'story views notion',
            commentary: ['Epictetus had been enslaved and taught from experience that much in life is outside our control. What remains ours is the view we take, and that is where he looks for freedom.'] },
          Object.assign({ id: 'marcus-8-47', tradition: 'philosophy', kind: 'quotation', locator: 'Book VIII, §47',
            text: 'If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgment about it. And it is in thy power to wipe out this judgment now.',
            themes: ['judgement'], keywords: 'pained power' }, MARCUS),
          { id: 'montaigne-17', tradition: 'philosophy', kind: 'quotation', author: 'Michel de Montaigne', work: 'Essays', locator: 'Book I, ch. XVII, “Of Fear”', translation: 'tr. Charles Cotton, ed. W. C. Hazlitt (1877)', rights: 'Public domain', read: { url: 'https://www.gutenberg.org/ebooks/3600', label: 'Read the Essays' }, checked: 'Project Gutenberg #3600 (GitHub mirror)',
            text: 'The thing in the world I am most afraid of is fear, that passion alone, in the trouble of it, exceeding all other accidents.',
            themes: ['judgement'], keywords: 'passion afraid of fear',
            commentary: ['Montaigne is the most candid voice in this movement. He does not claim to have mastered fear. He says fear is the thing he fears most.'] },
        ],
      },

      {
        id: 'new-step', numeral: 'IV', short: 'The new step', title: 'Dizziness and the new step',
        commentary: 'Some fear is not about danger at all. It comes before a possibility: the step that cannot be taken back, the word that cannot be unsaid. Here fear and freedom turn out to be close relations.',
        passages: [
          { id: 'kierkegaard-anxiety', tradition: 'philosophy', kind: 'paraphrase', author: 'Søren Kierkegaard', work: 'The Concept of Anxiety', locator: '1844, published under the pseudonym Vigilius Haufniensis', translation: 'English translations are under copyright: Reidar Thomte (Princeton, 1980); Walter Lowrie as The Concept of Dread (1944)', rights: 'Paraphrase · translations under copyright',
            text: 'Kierkegaard separates anxiety from fear. Fear has an object. Anxiety faces something undefined: our own possibility, what we are free to do or become. He compares it to the dizziness of someone who looks down into a deep abyss. The cause is partly the depth and partly the eye looking into it.',
            themes: ['freedom'], keywords: 'possibility choose choice',
            commentary: ['If he is right, some anxiety is a sign that you stand before a real choice. Treat it as the dizziness of freedom, not as a symptom to remove.'] },
          { id: 'phil-2-12', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Philippians', work: '', locator: 'Philippians 2:12', translation: KJV, rights: KJV_RIGHTS, read: bg('Philippians 2'), checked: KJV_CHECKED,
            text: 'Wherefore, my beloved, as ye have always obeyed, not as in my presence only, but now much more in my absence, work out your own salvation with fear and trembling.',
            themes: ['reverence', 'freedom'], keywords: 'trembling absence',
            commentary: ['Kierkegaard’s Fear and Trembling (1843) takes its title from this phrase. Here fear and trembling are not something to escape. They are the manner in which one works.'] },
          { id: 'crime-1', tradition: 'literature', kind: 'quotation', author: 'Fyodor Dostoevsky', work: 'Crime and Punishment', locator: 'Part I, ch. I', translation: 'tr. Constance Garnett (1914)', rights: 'Public domain in the US', read: { url: 'https://www.gutenberg.org/ebooks/2554', label: 'Read the novel' }, checked: 'Project Gutenberg #2554 (GitHub mirror)',
            text: 'It would be interesting to know what it is men are most afraid of. Taking a new step, uttering a new word is what they fear most....',
            themes: ['withholding', 'freedom'], keywords: 'step word act',
            commentary: ['Raskolnikov says this to himself while circling the terrible “new step” he is considering. The line is true, and the novel shows how a true insight can serve a ruinous purpose. Not every fear of the new step is cowardice.'] },
          { id: 'crane-1', tradition: 'literature', kind: 'quotation', author: 'Stephen Crane', work: 'The Red Badge of Courage', locator: 'ch. 1', translation: '1895', rights: 'Public domain', read: { url: 'https://www.gutenberg.org/ebooks/73', label: 'Read the novel' }, checked: 'Project Gutenberg #73 (GitHub mirror)',
            text: 'It had suddenly appeared to him that perhaps in a battle he might run. He was forced to admit that as far as war was concerned he knew nothing of himself.',
            themes: ['courage', 'tomorrow'], keywords: 'prove run',
            commentary: ['Henry Fleming’s fear comes before any battle. He fears what he might turn out to be. Crane had never been in battle when he wrote it.'] },
        ],
      },

      {
        id: 'edge', numeral: 'V', short: 'The edge of life', title: 'At the edge of life',
        commentary: 'Every serious account of fear eventually reaches death. These writers do not offer consolation. They ask what fear of death reveals about how a person has been living.',
        passages: [
          Object.assign({ id: 'marcus-2-11', tradition: 'philosophy', kind: 'quotation', locator: 'Book II, §11',
            text: 'Since it is possible that thou mayest depart from life this very moment, regulate every act and thought accordingly.',
            themes: ['death'], keywords: 'moment act' }, MARCUS),
          Object.assign({ id: 'marcus-12-1', tradition: 'philosophy', kind: 'quotation', locator: 'Book XII, §1 (part of a longer sentence)',
            text: '… and if thou shalt be afraid not because thou must some time cease to live, but if thou shalt fear never to have begun to live according to nature—then thou wilt be a man worthy of the universe which has produced thee …',
            themes: ['death', 'reverence'], keywords: 'begun live',
            commentary: ['This is the real passage behind a popular misquotation; see Sources & method. Marcus does not tell us to stop fearing. He tells us to fear the right thing: a life never truly begun.'] }, MARCUS),
          { id: 'idiot-5', tradition: 'literature', kind: 'quotation', author: 'Fyodor Dostoevsky', work: 'The Idiot', locator: 'Part I, ch. V', translation: 'tr. Eva Martin (1915)', rights: 'Public domain in the US', read: { url: 'https://www.gutenberg.org/ebooks/2638', label: 'Read the novel' }, checked: 'Project Gutenberg #2638 (GitHub mirror)',
            text: '“What should I do if I were not to die now? What if I were to return to life again? What an eternity of days, and all mine! How I should grudge and count up every minute of it, so as to waste not a single instant!”',
            themes: ['death'], keywords: 'execution scaffold minute eternity',
            commentary: [
              'Prince Myshkin is telling the story of a man who was led out to be shot and reprieved at the last moment. In December 1849 Dostoevsky himself went through a mock execution of this kind, and the passage is widely read as drawing on it.',
              'In the novel, the man did not in fact live as he had vowed. Dostoevsky does not let the vow off easily.',
            ] },
          { id: 'tolstoy-ivan', tradition: 'literature', kind: 'paraphrase', author: 'Leo Tolstoy', work: 'The Death of Ivan Ilych', locator: '1886; chs. II and XII', translation: 'Paraphrase of the story; the Louise and Aylmer Maude translation is public domain in the US', rights: 'Paraphrase · not checked against the text this session', read: { url: 'https://ccel.org/ccel/tolstoy/ivan/ivan.i.html', label: 'Read the story (CCEL)' },
            text: 'Ivan Ilych is a judge whose life has been correct, pleasant and decorous, and Tolstoy calls exactly that ordinariness terrible. When he falls ill, the people around him lie to him about his dying. What torments him most is the growing suspicion that he has not lived as he ought. In the last hours, once he stops defending that life, the fear of death leaves him, and in its place he finds light.',
            themes: ['death', 'withholding'], keywords: 'ordinary proper decorous',
            commentary: ['Tolstoy locates the fear of death in the unlived life, which is close to what Marcus says in XII.1. Read the story itself. The paraphrase cannot carry its force.'] },
          { id: 'henry-iv', tradition: 'literature', kind: 'quotation', author: 'William Shakespeare', work: 'The Second Part of King Henry the Fourth', locator: 'Act III, scene ii', translation: 'Feeble, a recruit', rights: 'Public domain', read: { url: 'https://www.gutenberg.org/ebooks/1782', label: 'Read the play' }, checked: 'Project Gutenberg #100 (GitHub mirror)',
            text: 'By my troth, I care not; a man can die but once; we owe God a death. I’ll ne’er bear a base mind. An’t be my destiny, so; an’t be not, so.',
            themes: ['death', 'courage'], keywords: 'die once owe destiny',
            commentary: ['Feeble is a woman’s tailor pressed into Falstaff’s ragged army. Of all the men in the scene, the least impressive one speaks most clearly about death.'] },
          { id: 'farewell-34', tradition: 'literature', kind: 'quotation', author: 'Ernest Hemingway', work: 'A Farewell to Arms', locator: 'ch. XXXIV', translation: '1929; text as printed by Standard Ebooks, which lightly modernizes spelling', rights: 'Public domain in the US since 2025; may be under copyright elsewhere', read: { url: 'https://standardebooks.org/ebooks/ernest-hemingway/a-farewell-to-arms', label: 'Read the novel' }, checked: 'Standard Ebooks source repository',
            text: 'If people bring so much courage to this world the world has to kill them to break them, so of course it kills them. The world breaks everyone and afterward many are strong at the broken places. But those that will not break it kills.',
            themes: ['courage', 'death'], keywords: 'broken strong',
            commentary: ['Frederic Henry says this in the novel’s last movement. It is usually quoted only for “strong at the broken places”. The full sentence is harder: courage offers no protection.'] },
          { id: 'aristotle-3-7', tradition: 'philosophy', kind: 'quotation', author: 'Aristotle', work: 'Nicomachean Ethics', locator: 'Book III, ch. VII', translation: 'tr. F. H. Peters (1906)', rights: 'Public domain', read: { url: 'https://standardebooks.org/ebooks/aristotle/the-nicomachean-ethics/f-h-peters', label: 'Read the Ethics' }, checked: 'Standard Ebooks edition of Peters (CC0)',
            text: 'He, then, that endures and fears what he ought from the right motive, and in the right manner, and at the right time, and similarly feels confidence, is courageous.',
            themes: ['courage', 'reverence'], keywords: 'ought right motive',
            commentary: ['For Aristotle, courage is not the absence of fear. It is fear rightly ordered: the right things, for the right reason, in the right way. This is surprisingly close to Proverbs and Matthew 10:28.'] },
        ],
      },

      {
        id: 'reverent-dread', numeral: 'VI', short: 'Reverent dread', title: 'Reverent dread',
        commentary: 'The contemplatives end where the first movement began, with the difference between two fears. They add something the philosophers do not: fear met in company, inside a relationship of trust.',
        passages: [
          { id: 'julian-74', tradition: 'contemplative', kind: 'quotation', author: 'Julian of Norwich', work: 'Revelations of Divine Love', locator: 'ch. LXXIV', translation: 'ed. Grace Warrack (1901)', rights: 'Public domain in the US', read: { url: 'https://www.gutenberg.org/ebooks/52958', label: 'Read the Revelations' }, checked: 'Project Gutenberg #52958 (GitHub mirror)',
            text: 'The fourth is reverent dread: for there is no dread that fully pleaseth God in us but reverent dread.',
            themes: ['reverence', 'love'], keywords: 'dread kinds',
            commentary: ['Julian lists four kinds of dread, and only this one does she keep. In the same chapter she writes that “Love and Dread are brethren.” She lived as an anchoress in Norwich, enclosed in a cell, and wrote after visions she received in 1373.'] },
          { id: 'julian-27', tradition: 'contemplative', kind: 'quotation', author: 'Julian of Norwich', work: 'Revelations of Divine Love', locator: 'ch. XXVII', translation: 'ed. Grace Warrack (1901)', rights: 'Public domain in the US', read: { url: 'https://www.gutenberg.org/ebooks/52958', label: 'Read the Revelations' }, checked: 'Project Gutenberg #52958 (GitHub mirror)',
            text: 'It behoved that there should be sin; but all shall be well, and all shall be well, and all manner of thing shall be well.',
            themes: ['trust'], keywords: 'well',
            commentary: ['People often quote the second half alone. Julian’s sentence begins by admitting the worst. The reassurance comes after that admission, not instead of it.'] },
          { id: 'merton-prayer', tradition: 'contemplative', kind: 'paraphrase', author: 'Thomas Merton', work: 'Thoughts in Solitude', locator: '1958, Part Two; the prayer that begins “My Lord God, I have no idea where I am going”', translation: 'Under copyright · Farrar, Straus and Giroux', rights: 'Paraphrase · under copyright',
            text: 'Merton, a Trappist monk at the Abbey of Gethsemani in Kentucky, prays as someone who does not know where he is going and does not fully know himself. He trusts that the desire to please God is itself pleasing to God, and that he will be led even when he seems lost. He ends by refusing fear, because he believes he will not be left to face his dangers alone.',
            themes: ['trust', 'tomorrow'], keywords: 'lost uncertain alone know',
            commentary: ['Merton’s prayer gives fear an honest answer. He does not claim certainty. He claims company, which links him to Isaiah 41:10 at the start of movement II.'] },
          { id: 'ps-27-14', tradition: 'scripture', kind: 'quotation', verse: true, author: 'Psalm 27', work: '', locator: 'Psalm 27:14', translation: KJV, rights: KJV_RIGHTS, read: bg('Psalm 27'), checked: KJV_CHECKED,
            text: 'Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD.',
            themes: ['trust', 'courage'], keywords: 'wait patience',
            commentary: ['The psalm that began “whom shall I fear?” ends by telling the reader to wait. In the psalm, courage includes waiting.'] },
        ],
      },
    ],
  };
})();
