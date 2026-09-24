# AstroTrainer

BUILD A COMPLETE WEB APPLICATION CALLED:

"ASTROTRAINER"

A serious astronomy-observation and astronomy-olympiad preparation platform.

The application should combine:

- realistic interactive sky maps

- constellation recognition

- star identification

- Messier-object identification

- observation-style exercises

- a constellation reference atlas

- adaptive practice

- performance tracking

The first fully implemented module should be CONSTELLATION IDENTIFICATION, but the architecture must be designed so that star identification, Messier identification, and other astronomy-olympiad observation exercises can be added later without rebuilding the application.

============================================================

1. PRODUCT VISION

============================================================

This is NOT intended to be a generic astronomy trivia website.

It should feel like:

Stellarium

-

an interactive astronomy atlas

-

a Duolingo-style practice system

-

an astronomy olympiad observation trainer.

The most important principles are:

1. Astronomical correctness

2. Real astronomical coordinates and magnitudes

3. Realistic star maps

4. Recognition rather than memorization of screenshots

5. Progressive difficulty

6. Educational feedback after every question

7. Clean, uncluttered visualization

8. Adaptive practice

9. Extensible architecture

The star map is the primary visual element.

Avoid excessive decorative UI.

============================================================

2. TECHNOLOGY

============================================================

Build this as a modern responsive web application.

Preferred stack:

- React

- TypeScript

- Vite

- Tailwind CSS

- component-based architecture

- localStorage for anonymous progress initially

For astronomical rendering, use a proper canvas/WebGL-based visualization library where appropriate.

Suitable options include:

- D3

- PixiJS

- Three.js

- Astronomy Engine where useful

- custom Canvas rendering

Do NOT use a collection of static star-map screenshots.

The sky map must be generated from astronomical data.

The architecture must separate:

ASTRONOMICAL DATA

from

RENDERING

from

QUESTION GENERATION

from

UI.

============================================================

3. MAIN APPLICATION STRUCTURE

============================================================

Create these primary sections:

HOME

PRACTICE

CONSTELLATIONS

PROGRESS

Future-ready sections:

STARS

MESSIER

OBSERVATION EXAM

Do not fully implement the future sections unless necessary for navigation architecture.

Main navigation:

Home

Practice

Constellations

Progress

============================================================

4. HOME PAGE

============================================================

Create a clean landing/dashboard page.

Show:

ASTROTRAINER

Subtitle:

Astronomy Observation Training

Primary actions:

[ Start Practice ]

[ Explore Constellations ]

[ View Progress ]

Show a small dashboard:

Questions completed

Accuracy

Constellations practiced

Weakest constellation

If there is no history, show a welcoming empty state.

Do not require login.

============================================================

5. PRACTICE PAGE

============================================================

The main practice page should allow selection of:

Constellation Identification

Difficulty:

Beginner

Intermediate

Advanced

Future modes should be architecturally supported:

Identify Star

Find Star on Map

Identify Messier Object

Find Messier Object

Coordinate Exercises

Observation Simulation

============================================================

6. CONSTELLATION IDENTIFICATION

============================================================

The first complete game mode is:

"Identify the Constellation"

The user sees an interactive astronomical sky field.

They are given four possible constellation answers.

They select the constellation they believe is displayed.

The map must be generated dynamically.

Do NOT use a static screenshot.

============================================================

7. BEGINNER MODE

============================================================

Beginner is a learning-oriented mode.

BEFORE ANSWERING:

Show:

- target stars

- conventional constellation stick figure

- bright stars

- focused sky field

- optional limited labels

The constellation should be visually obvious.

The user chooses one of four answers.

The stick figure is intentionally visible.

============================================================

8. INTERMEDIATE MODE

============================================================

Intermediate tests actual constellation recognition.

BEFORE ANSWERING:

Show:

- realistic stars

- target constellation

- surrounding stars

Hide:

- constellation stick figure

- constellation name

- star labels

- unnecessary hints

The user must recognize the pattern from the stars.

The target should be centered and visually prominent.

Do not show huge areas of sky.

============================================================

9. ADVANCED MODE

============================================================

Advanced should simulate a more realistic observation challenge.

BEFORE ANSWERING:

Hide:

- constellation stick figure

- constellation name

- star labels

- unnecessary hints

Show:

- more faint stars

- more surrounding stars

- realistic sky density

- moderate neighboring-star clutter

- target constellation

Use controlled orientation variation.

The goal is recognition from the sky itself.

============================================================

10. CRITICAL RULE — POST-ANSWER FEEDBACK

============================================================

AFTER ANSWERING, ALL THREE DIFFICULTIES MUST PROVIDE THE SAME EDUCATIONAL INFORMATION.

This is extremely important.

Beginner:

Question

→ Answer

→ Full constellation details

Intermediate:

Question

→ Answer

→ Full constellation details

Advanced:

Question

→ Answer

→ Full constellation details

Difficulty controls the challenge BEFORE answering.

It must NOT restrict the educational information AFTER answering.

============================================================

11. POST-ANSWER REVEAL

============================================================

After every answer:

Show:

Correct / Incorrect

Then:

CONSTELLATION NAME

TRADITIONAL FIGURE

Example:

ORION

The Great Hunter

Then update the SAME sky map to show:

- conventional constellation stick figure

- important bright-star labels

- constellation name

- relevant facts

The lines must align exactly with the stars.

Do NOT replace the sky map with a static illustration.

============================================================

12. POST-ANSWER INFORMATION PANEL

============================================================

Show a concise educational panel.

Example:

✓ Correct

ORION

The Great Hunter

Key stars:

- Betelgeuse

- Bellatrix

- Alnilam

- Alnitak

- Mintaka

- Rigel

Description:

[existing constellation description]

Best observed:

Winter evenings

Then:

[ Study Constellation ]

[ Next Question ]

If incorrect:

✕ Incorrect

Correct answer:

ORION

Then the same educational information.

============================================================

13. STUDY CONSTELLATION

============================================================

After answering, provide:

[ Study Constellation ]

Clicking this should open the same constellation in the reference sky viewer.

Example:

Question → Orion

Answer → Reveal Orion

Study Constellation → opens Orion in reference mode.

Do NOT create a separate sky renderer.

Use the same StarMap component.

============================================================

14. CONSTELLATION STICK FIGURES

============================================================

This is a HIGH PRIORITY REQUIREMENT.

Do NOT invent constellation stick figures.

The application must use recognized conventional modern astronomical constellation line figures.

Important distinction:

The IAU officially defines the 88 constellations and their boundaries.

The familiar stick figures are traditional/conventional representations.

Therefore use a consistent established astronomical convention, preferably matching a recognized modern astronomical sky-culture source such as Stellarium.

The figures must NOT be arbitrary AI-generated shapes.

============================================================

15. STANDARD CONSTELLATION LINE DATA

============================================================

Store line data in the astronomical dataset.

Example:

{

"id": "ori",

"name": "Orion",

"lineData": [

    ["betelgeuse", "bellatrix"],

    ["bellatrix", "alnilam"],

    ["alnilam", "alnitak"],

    ...

]

}

Every line connection must reference real stars.

Do NOT hard-code lines inside UI components.

Do NOT create separate line data for Beginner/Intermediate/Advanced.

All modes use the same underlying figure.

============================================================

16. ALL 88 CONSTELLATIONS

============================================================

The application must contain exactly the 88 official IAU constellations:

Andromeda

Antlia

Apus

Aquarius

Aquila

Ara

Aries

Auriga

Boötes

Caelum

Camelopardalis

Cancer

Canes Venatici

Canis Major

Canis Minor

Capricornus

Carina

Cassiopeia

Centaurus

Cepheus

Cetus

Chamaeleon

Circinus

Columba

Coma Berenices

Corona Australis

Corona Borealis

Corvus

Crater

Crux

Cygnus

Delphinus

Dorado

Draco

Equuleus

Eridanus

Fornax

Gemini

Grus

Hercules

Horologium

Hydra

Hydrus

Indus

Lacerta

Leo

Leo Minor

Lepus

Libra

Lupus

Lynx

Lyra

Mensa

Microscopium

Monoceros

Musca

Norma

Octans

Ophiuchus

Orion

Pavo

Pegasus

Perseus

Phoenix

Pictor

Pisces

Piscis Austrinus

Puppis

Pyxis

Reticulum

Sagitta

Sagittarius

Scorpius

Sculptor

Scutum

Serpens

Sextans

Taurus

Telescopium

Triangulum

Triangulum Australe

Tucana

Ursa Major

Ursa Minor

Vela

Virgo

Volans

Vulpecula

Exactly 88.

No duplicates.

============================================================

17. CONSTELLATION DATA MODEL

============================================================

Use a structured dataset.

Conceptually:

{

id,

name,

abbreviation,

description,

figure,

hemisphere,

region,

isEcliptic,

brightStars,

lineData,

bestSeason

}

Do not duplicate this information across components.

============================================================

18. STAR DATA MODEL

============================================================

Stars should contain:

{

id,

name,

bayer,

ra,

dec,

magnitude

}

Where available also retain:

- HIP identifier

- HD identifier

- common name

- spectral type

Use actual astronomical values.

============================================================

19. ASTRONOMICAL DATA SOURCES

============================================================

Use real astronomical data.

PRIMARY BRIGHT STAR SOURCE:

Yale Bright Star Catalogue / V/50:

https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=V/50

Use for:

- RA

- Dec

- apparent magnitude

- bright star identifiers

SIMBAD:

https://simbad.u-strasbg.fr/simbad/

Use for:

- object identification

- star names

- Bayer designations

- coordinate verification

IAU:

https://www.iau.org/public/themes/constellations/

Use for:

- official list of 88 constellations

- official constellation identities

- authoritative constellation information

STELLARIUM:

https://stellarium.org/

Use as a reference for:

- conventional constellation line figures

- sky-culture representation

- visual validation

Do NOT invent coordinates.

Do NOT invent star identities.

Do NOT fabricate constellation line connections.

============================================================

20. STAR MAP

============================================================

Create one reusable StarMap component.

It must support:

- RA/Dec projection

- star rendering

- magnitude-based brightness

- zoom

- pan

- dynamic FOV

- constellation lines

- labels

- orientation

- target highlighting

- rotation

- reset

- fit-to-constellation

The same StarMap must be used by:

Practice

Post-answer reveal

Study Constellation

View in Sky

============================================================

21. STAR VISUALIZATION

============================================================

Stars should visually vary by apparent magnitude.

Bright stars:

- larger

- brighter

- subtle glow

Faint stars:

- smaller

- dimmer

Do not render random decorative dots as stars.

Every displayed astronomical star should come from the star dataset.

============================================================

22. FIELD OF VIEW

============================================================

The current problem with the application is that too much sky can appear at once.

Do NOT use one universal FOV.

Calculate FOV dynamically based on the target constellation.

Process:

1. Identify stars used in the constellation figure.

2. Find their angular extent.

3. Determine center.

4. Determine width/height.

5. Add margin.

6. Select FOV.

7. Center target.

Small constellation:

→ tighter FOV

Large constellation:

→ wider FOV

Very large constellation:

→ enough FOV to contain the entire recognizable structure.

Examples requiring special testing:

Hydra

Eridanus

Draco

Cetus

Virgo

Also test compact constellations:

Crux

Sagitta

Delphinus

Equuleus

Triangulum

============================================================

23. ZOOM / PAN

============================================================

Preserve and implement:

Zoom In

Zoom Out

Pan

Reset View

Fit Constellation

Fit Constellation dynamically recalculates the optimal FOV.

Users can zoom further after fitting.

============================================================

24. LABEL SYSTEM

============================================================

Implement:

labelMode:

none

target

important

all

Before answer:

Intermediate:

none

Advanced:

none

Beginner:

minimal/optional

After answer:

important

Reference mode:

important

Avoid showing excessive bright-star names.

Example Orion important stars:

Betelgeuse

Bellatrix

Alnilam

Alnitak

Mintaka

Rigel

Do not label every surrounding star.

============================================================

25. CONSTELLATION DISTRACTION

============================================================

Difficulty controls surrounding star density.

Beginner:

- brighter stars

- minimal distractions

- stick figure visible

Intermediate:

- moderate surrounding stars

- no figure

- no labels

Advanced:

- more faint stars

- more surrounding stars

- realistic clutter

- no figure

- no labels

Do not make the target disappear.

============================================================

26. RANDOM ORIENTATION

============================================================

Intermediate and Advanced should support controlled random orientation.

Purpose:

Prevent memorization of a fixed screenshot.

The transformation must be maintained when revealing the answer.

The stick figure must align with the transformed stars.

Do not rotate so aggressively that the sky becomes obviously artificial.

============================================================

27. ORIENTATION INDICATOR

============================================================

Add a small unobtrusive compass:

      N

      ↑

W ← + → E

      ↓

      S

Reuse an existing orientation system if available.

============================================================

28. ANSWER CHOICES

============================================================

Provide four choices.

Do not choose four completely random constellations.

Prefer plausible distractors based on:

- nearby sky region

- similar visual geometry

- similar size

- common confusion

Examples:

Orion:

Taurus

Gemini

Auriga

Canis Major

Cygnus:

Lyra

Aquila

Cepheus

Cassiopeia

Scorpius:

Sagittarius

Ophiuchus

Libra

Ara

============================================================

29. CONSTELLATIONS REFERENCE PAGE

============================================================

Create a complete atlas of all 88 constellations.

Each card should contain:

Name

Abbreviation

Traditional figure

Description

Key stars

Best observing season

View in Sky

Example:

ORION

Abbreviation: Ori

Figure:

The Great Hunter

Key stars:

Betelgeuse

Bellatrix

Alnilam

Alnitak

Mintaka

Rigel

[ View in Sky ]

============================================================

30. TRADITIONAL FIGURE NAMES

============================================================

Include established traditional representations.

Examples:

Andromeda — The Princess / Chained Maiden

Antlia — The Air Pump

Apus — The Bird of Paradise

Aquarius — The Water-Bearer

Aquila — The Eagle

Ara — The Altar

Aries — The Ram

Auriga — The Charioteer

Boötes — The Herdsman

Caelum — The Chisel

Camelopardalis — The Giraffe

Cancer — The Crab

Canes Venatici — The Hunting Dogs

Canis Major — The Great Dog

Canis Minor — The Little Dog

Capricornus — The Sea-Goat

Carina — The Keel

Cassiopeia — The Queen

Centaurus — The Centaur

Cepheus — The King

Cetus — The Sea Monster

Chamaeleon — The Chameleon

Circinus — The Compass

Columba — The Dove

Coma Berenices — Berenice's Hair

Corona Australis — The Southern Crown

Corona Borealis — The Northern Crown

Corvus — The Crow

Crater — The Cup

Crux — The Southern Cross

Cygnus — The Swan

Delphinus — The Dolphin

Dorado — The Dolphinfish

Draco — The Dragon

Equuleus — The Little Horse

Eridanus — The River

Fornax — The Furnace

Gemini — The Twins

Grus — The Crane

Hercules — Hercules

Horologium — The Clock

Hydra — The Water Serpent

Hydrus — The Lesser Water Snake

Indus — The Indian

Lacerta — The Lizard

Leo — The Lion

Leo Minor — The Little Lion

Lepus — The Hare

Libra — The Scales

Lupus — The Wolf

Lynx — The Lynx

Lyra — The Lyre

Mensa — Table Mountain

Microscopium — The Microscope

Monoceros — The Unicorn

Musca — The Fly

Norma — The Carpenter's Square

Octans — The Octant

Ophiuchus — The Serpent-Bearer

Orion — The Great Hunter

Pavo — The Peacock

Pegasus — The Winged Horse

Perseus — Perseus

Phoenix — The Phoenix

Pictor — The Painter's Easel

Pisces — The Fish

Piscis Austrinus — The Southern Fish

Puppis — The Stern

Pyxis — The Compass

Reticulum — The Reticle

Sagitta — The Arrow

Sagittarius — The Archer

Scorpius — The Scorpion

Sculptor — The Sculptor

Scutum — The Shield

Serpens — The Serpent

Sextans — The Sextant

Taurus — The Bull

Telescopium — The Telescope

Triangulum — The Triangle

Triangulum Australe — The Southern Triangle

Tucana — The Toucan

Ursa Major — The Great Bear

Ursa Minor — The Little Bear

Vela — The Sails

Virgo — The Maiden

Volans — The Flying Fish

Vulpecula — The Fox

These are traditional representations, not official IAU descriptions.

============================================================

31. CONSTELLATION SEARCH

============================================================

Add:

Search constellations...

Search by:

- name

- abbreviation

Examples:

"ori" → Orion

"UMa" → Ursa Major

============================================================

32. CONSTELLATION CATEGORIES

============================================================

Create:

All

Northern

Equatorial

Southern

Ecliptic

The Ecliptic category must contain:

Aries

Taurus

Gemini

Cancer

Leo

Virgo

Libra

Scorpius

Ophiuchus

Sagittarius

Capricornus

Aquarius

Pisces

IMPORTANT:

Ophiuchus MUST be included.

This refers to the astronomical ecliptic path, not merely the traditional 12-sign astrological zodiac.

============================================================

33. VIEW IN SKY

============================================================

Every constellation card must have:

[ View in Sky ]

Clicking it opens the existing StarMap.

Default:

Lines ON

Important Labels ON

Automatically:

- center target

- calculate FOV

- fit target

- show standard figure

- show important stars

Controls:

Lines ON/OFF

Labels ON/OFF

Zoom In

Zoom Out

Reset

Fit Constellation

============================================================

34. RANDOM CONSTELLATION

============================================================

Add:

[ Random Constellation ]

It selects one of the 88 and opens it in View in Sky.

============================================================

35. SEASONAL INFORMATION

============================================================

Where reliable data is available, display:

Best observed:

Winter

Spring

Summer

Autumn

or an appropriate concise description.

Do not fabricate seasonal visibility.

============================================================

36. PROGRESS SYSTEM

============================================================

Use localStorage initially.

Track:

- total questions

- correct answers

- incorrect answers

- accuracy

- average response time

- best score

- per-constellation performance

Per constellation:

{

attempts,

correct,

incorrect,

accuracy,

averageTime,

bestScore

}

============================================================

37. MASTERY

============================================================

Create a constellation mastery visualization.

Example:

ORION

██████████ 100%

TAURUS

████████░░ 80%

SCORPIUS

██████░░░░ 60%

OPHIUCHUS

████░░░░░░ 40%

Do not mark a constellation mastered after one correct answer.

Require repeated successful attempts.

============================================================

38. WEAK CONSTELLATION PRACTICE

============================================================

Add:

[ Practice Weak Constellations ]

This mode prioritizes constellations with low accuracy.

Example:

Your weakest constellations:

Ophiuchus — 42%

Capricornus — 51%

Aquarius — 55%

[ Practice These ]

If insufficient history exists, use random practice.

============================================================

39. RESULTS

============================================================

Preserve/display:

Score

Accuracy

Correct

Incorrect

Average response time

Also display:

Strongest constellation

Weakest constellation

if enough data exists.

============================================================

40. TIMER

============================================================

Support timed practice.

Preserve the existing timer if one exists.

When time expires:

- mark incorrect

- reveal correct answer

- show stick figure

- show constellation details

Track response time.

============================================================

41. SCORING

============================================================

Use a simple transparent scoring system.

At minimum:

Correct answer = points

Optionally:

speed bonus

Do not make scoring unnecessarily complicated.

============================================================

42. DATA VALIDATION

============================================================

Create:

validateAstronomyData()

It must verify:

- exactly 88 constellations

- unique IDs

- unique abbreviations

- valid RA

- valid Dec

- valid magnitude

- all star references exist

- all line references exist

- no dangling line references

- every constellation has renderable data

- every constellation can be opened

- every constellation can be used in practice

Development mode should report errors clearly.

============================================================

43. TEST CONSTELLATIONS

============================================================

After implementation explicitly test:

Orion

Taurus

Gemini

Cancer

Leo

Virgo

Libra

Scorpius

Ophiuchus

Sagittarius

Capricornus

Aquarius

Pisces

Cassiopeia

Andromeda

Perseus

Cepheus

Cygnus

Lyra

Aquila

Hercules

Ursa Major

Ursa Minor

Draco

Canis Major

Canis Minor

Crux

Centaurus

Hydra

Eridanus

Vela

============================================================

44. REQUIRED TESTS

============================================================

Verify:

1. All 88 constellations exist.

2. No duplicates.

3. Every constellation has a valid abbreviation.

4. Every constellation can be searched.

5. Every constellation appears in the appropriate category.

6. Ecliptic category works.

7. Ophiuchus is in Ecliptic.

8. Beginner shows stick figure before answer.

9. Beginner reveals full details after answer.

10. Intermediate hides stick figure before answer.

11. Intermediate reveals full details after answer.

12. Advanced hides stick figure before answer.

13. Advanced reveals full details after answer.

14. Revealed stick figure aligns with stars.

15. Stick figures use recognized conventional astronomical line data.

16. No invented line figures.

17. Star labels are not cluttered.

18. Target constellation is centered.

19. FOV is dynamically calculated.

20. Large constellations fit.

21. Small constellations are not tiny.

22. Zoom works.

23. Pan works.

24. Reset works.

25. Fit Constellation works.

26. Lines toggle works.

27. Labels toggle works.

28. View in Sky works.

29. Random constellation works.

30. Search works.

31. Progress updates.

32. Weak practice works.

33. Timer works.

34. Results work.

35. Existing functionality does not break.

============================================================

45. ARCHITECTURE FOR FUTURE MODES

============================================================

Design the question system so that future question types can be added.

Conceptually:

QuestionType:

IDENTIFY_CONSTELLATION

IDENTIFY_STAR

FIND_STAR

IDENTIFY_MESSIER

FIND_MESSIER

COORDINATE_TASK

OBSERVATION_TASK

A question should conceptually contain:

{

id,

type,

target,

difficulty,

skyState,

choices,

correctAnswer

}

Do not implement every future mode now.

But do not build the current constellation system in a way that makes future modes difficult.

============================================================

46. FUTURE STAR IDENTIFICATION

============================================================

Architecture should eventually support:

"Which star is marked?"

and:

"Mark Betelgeuse on the map."

The existing StarMap should already be capable of:

- highlighting an object

- detecting clicks

- returning nearest star

- converting screen coordinates to sky coordinates

Do not necessarily expose this UI yet.

============================================================

47. FUTURE MESSIER SYSTEM

============================================================

Architecture should eventually support:

Identify M31

Identify M42

Identify M13

Find M57

etc.

Future Messier data should contain:

{

id,

name,

commonName,

ra,

dec,

magnitude,

type,

constellation

}

Do not implement the complete Messier system unless explicitly requested.

============================================================

48. USER EXPERIENCE

============================================================

Keep the visual design clean.

The star map should dominate the screen during practice.

Controls should be unobtrusive.

Use:

- dark astronomy-inspired interface

- clear typography

- subtle animations

- strong contrast

- accessible controls

Avoid:

- excessive cards

- excessive text

- giant buttons

- unnecessary gradients

- excessive animation

- labels covering stars

- cluttered UI

============================================================

49. RESPONSIVENESS

============================================================

Support:

Desktop

Laptop

Tablet

Mobile

On smaller screens:

- map remains usable

- controls remain accessible

- answer choices remain easy to tap

- information panel can stack vertically

Do not sacrifice the astronomy map to fit decorative UI.

============================================================

50. PERFORMANCE

============================================================

The application should remain responsive while rendering many stars.

Use:

- efficient canvas/WebGL rendering

- memoized astronomical datasets

- avoid unnecessary React re-renders

- efficient coordinate transformations

- efficient label rendering

Do not reload large datasets on every question.

============================================================

51. NO FABRICATED ASTRONOMY

============================================================

This is a strict rule.

Never invent:

- star coordinates

- magnitudes

- star names

- constellation memberships

- line connections

- Messier coordinates

- astronomical facts

If data is uncertain:

use an authoritative source

or leave the field unavailable.

Never hallucinate astronomy data merely to complete the UI.

============================================================

52. IMPORTANT DISTINCTION

============================================================

Keep these separate:

A. IAU constellation identity

B. IAU constellation boundary

C. Traditional constellation stick figure

D. Individual star positions

The application currently needs C for visual recognition.

Do not confuse C with B.

============================================================

53. IMPLEMENTATION STRATEGY

============================================================

Before coding:

1. Inspect project architecture.

2. Establish the astronomy data schema.

3. Establish StarMap API.

4. Load/normalize star data.

5. Load/normalize 88 constellations.

6. Load standard constellation line data.

7. Validate all references.

8. Build dynamic FOV.

9. Build practice state system.

10. Build reveal state.

11. Build reference viewer.

12. Build progress tracking.

Reuse shared components.

Do not duplicate astronomy logic.

============================================================

54. MOST IMPORTANT ARCHITECTURAL RULE

============================================================

There must be:

ONE astronomy dataset

ONE StarMap renderer

ONE constellation line-data system

ONE constellation metadata system

ONE question-generation system

Different modes should simply change:

- visibility

- difficulty

- labels

- star density

- orientation

- answer behavior

For example:

Orion in Beginner

Orion in Intermediate reveal

Orion in Advanced reveal

Orion in Constellations → View in Sky

must all use the SAME:

- star positions

- star identities

- constellation line figure

- important star list

- metadata

============================================================

55. FINAL EXPERIENCE

============================================================

The application should create this learning loop:

LEARN

↓

PRACTICE

↓

IDENTIFY

↓

ANSWER

↓

REVEAL

↓

UNDERSTAND

↓

STUDY

↓

TRACK PERFORMANCE

↓

PRACTICE WEAK AREAS

↓

IMPROVE

The final product should feel like a serious astronomy olympiad observation trainer.

It should be scientifically grounded, visually clean, interactive, and extensible.

Do NOT build a generic quiz website.

Build an astronomy training instrument.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7e06cdb1-0245-4bd3-9f2f-4d7bbc8bb11f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
