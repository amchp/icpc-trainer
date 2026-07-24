export const introduction = {
  loading: "Loading the Introduction guide...",
  roadmap: "Learning roadmap",
  eyebrow: "Class 01 · Introduction",
  title: "Enter the contest room.",
  subtitle: "Learn how competitive programming works, install C++, play three strategy games, and send your first solution to a Judge.",
  routeLabel: "Class route",
  routeProgress: "Stop {{current}} of {{total}}",
  sections: {
    mentalModel: "How it works",
    icpc: "Inside ICPC",
    plate: "Plate Game",
    languages: "Programming languages",
    setup: "Install C++",
    stones: "25 Stones",
    codeforces: "Understanding Codeforces",
    practice: "How to practice",
    chomp: "Chomp",
    roadmap: "Where to go next"
  },
  mentalModel: {
    kicker: "Mental model",
    title: "How competitive programming works.",
    p1: "Competitive programming Problems use a consistent structure. Walk through the exact Problem you will submit later to see what each section contributes before you write any code.",
    problemTitle: "A. Watermelon",
    timeLimitLabel: "Time limit per test",
    timeLimit: "1 second",
    memoryLimitLabel: "Memory limit per test",
    memoryLimit: "64 megabytes",
    limitsGuide: "The limits tell you how quickly the program must finish and how much memory it may use. They help you decide whether an approach is practical.",
    statementTitle: "Statement",
    statementP1: "One hot summer day Pete and his friend Billy decided to buy a watermelon. They chose the biggest and ripest one, in their opinion. After the watermelon was weighed, the scales showed w kilos. They rushed home and decided to divide it, but faced a problem.",
    statementP2: "Pete and Billy want to divide the watermelon so that each of the two parts weighs an even number of kilos. The parts do not need to be equal, but each person must receive a part with positive weight. Determine whether they can divide the watermelon this way.",
    statementGuide: "The story provides context; the task hidden inside it is to decide whether one weight can become two positive even weights.",
    inputTitle: "Input",
    inputText: "The first and only input line contains the integer w (1 ≤ w ≤ 100), the weight of the watermelon in kilos.",
    inputGuide: "The Input section defines exactly what your program reads. Here it reads one integer, and the constraint tells you every possible value is between 1 and 100.",
    outputTitle: "Output",
    outputText: "Print YES if the watermelon can be divided into two parts that both weigh an even number of kilos; otherwise, print NO.",
    outputGuide: "The Output section defines the required answer and spelling. Printing an explanation instead of exactly YES or NO would be judged incorrect.",
    exampleTitle: "Example",
    sampleInputLabel: "Input",
    sampleInput: "8",
    sampleOutputLabel: "Output",
    sampleOutput: "YES",
    noteTitle: "Note.",
    noteText: "A watermelon weighing 8 kilos can be divided into 2 and 6 kilos, or into 4 and 4 kilos.",
    exampleGuide: "The sample demonstrates one valid input and its expected output. It helps confirm your understanding, but the Judge will also test cases that are not shown here.",
    p2: "Use the statement, constraints, and examples to understand what the program must do before writing code. A watermelon weighing 8 can be split into 4 and 4, so the answer is YES. A watermelon weighing 2 cannot be split into two positive even weights, so the answer is NO.",
    p3: "From those cases, you can derive the rule: the weight must be even and greater than 2. You then express that rule in C++, compile it, and test it locally with inputs such as 8 and 2. The full source and commands appear in the submission section later on this page.",
    p4: "When you submit, the Judge compiles your source and runs it against hidden inputs within fixed time and memory limits. It returns a verdict that tells you whether the program was accepted or whether you need to inspect its build, output, speed, or runtime behavior.",
    verdictsTitle: "Verdicts from the Judge",
    verdicts: {
      ac: "AC · Accepted — correct on every test",
      wa: "WA · Wrong Answer — output differs",
      tle: "TLE · Time Limit Exceeded — too slow",
      rte: "RTE · Runtime Error — crashed while running",
      ce: "CE · Compilation Error — source did not build"
    }
  },
  icpc: {
    kicker: "Competition",
    title: "ICPC is a five-hour team strategy game.",
    p1: "In an ICPC contest, a university team of three shares one computer. Teams choose which Problems to attack, communicate partial ideas, debug under pressure, and submit to a Judge during a five-hour contest.",
    p2: "Ranking starts with solved count, then penalty time. Regional contests lead toward later stages. The format rewards clear roles and good decisions as much as fast typing.",
    p3: "Strong teams keep a shared picture of the contest. One teammate can read a new statement while another checks an idea and the person at the computer implements the most promising solution. Roles change constantly as new information arrives.",
    p4: "A rejected submission costs time and attention, so teams test assumptions before submitting. They also return to partially solved Problems when a new observation appears instead of treating the first failed idea as the end.",
    levelsTitle: "ICPC competition levels",
    levels: {
      university: {
        title: "University internal competition",
        description: "Students form teams and compete within their university. Schools often use this stage to select representatives and help new teams practice the ICPC format."
      },
      national: {
        title: "National competition",
        description: "Teams meet competitors from universities across their country. Depending on the local pathway, this may be a national title event, a qualifier, or both."
      },
      regional: {
        title: "Regional competition",
        description: "University teams compete in an official ICPC regional contest. Results at this stage determine which teams can advance through their region's qualification path."
      },
      regionalChampionship: {
        title: "Regional Championship",
        description: "Where the region uses this stage, leading teams from its qualifying contests meet in a championship that determines or helps determine World Finals qualification."
      },
      worldFinals: {
        title: "World Finals",
        description: "Qualifying teams from ICPC regions around the world meet for the global championship and compete under the full five-hour ICPC format."
      }
    },
    official: "Read the official ICPC overview",
    statTeam: "3 people",
    statComputer: "1 computer",
    statTime: "5 hours"
  },
  plateLesson: {
    kicker: "Play break",
    title: "Plate Game.",
    intro: "Two players place radius-one circles on a board that starts at 7×7; change its width and height in the game to explore other rectangles. Circles may touch, but they cannot overlap or cross the board boundary. The player who makes the final legal placement wins.",
    p2: "Click anywhere on the board to try a placement. A legal center must stay at least one unit from every edge and at least two units from every existing center. An invalid click leaves the board and the active player unchanged."
  },
  languages: {
    title: "Programming languages.",
    intro: "A programming language is the notation you use to express an algorithm. The Judge supports several languages, but each compiler or runtime has different speed, memory use, libraries, and syntax.",
    cppTitle: "C++",
    pythonTitle: "Python",
    prosTitle: "Pros",
    consTitle: "Cons",
    cppPros: {
      speed: "Fast execution and precise memory control make it dependable for tight limits and large inputs.",
      library: "The standard library provides efficient containers and algorithms commonly needed in contests.",
      debugging: "Static types let the compiler catch many mistakes before the program runs, which often makes C++ easier to debug."
    },
    cppCons: {
      syntax: "Solutions are usually longer and require more syntax than equivalent Python programs.",
      safety: "Manual indexing, memory access, and numeric types can introduce subtle bugs if used carelessly."
    },
    pythonPros: {
      concise: "Concise syntax lets you turn a clear idea into source code quickly.",
      features: "Built-in support for large integers and expressive string and collection operations can simplify a solution.",
      useCases: "It works well for straightforward simulations and algorithms that comfortably fit the limits."
    },
    pythonCons: {
      performance: "Slower execution and higher memory use can be risky for large inputs or performance-heavy algorithms.",
      types: "Dynamic typing means some type mistakes appear only when the program reaches that code at runtime."
    },
    choice: "Use C++ as your default while learning this course. Choose Python when it makes the solution substantially clearer and the constraints leave enough time for it to run. The algorithm matters more than the language, but the limits determine which implementations are practical."
  },
  setup: {
    kicker: "Environment",
    title: "Install C++.",
    intro: "Choose the supported path for your machine. Read what the script changes, download it from this app, run it yourself, and verify the compiler path and version printed at the end. ICPC Trainer never runs these files.",
    p2: "Your editor and compiler have different jobs. VS Code helps you navigate and edit source files; g++ translates C++ into a program your computer can run.",
    p3: "Treat installation as a sequence of observable checks. Confirm each command finishes, open a fresh terminal so PATH changes apply, and compile one tiny program before relying on the environment during a Contest.",
    windows: "Windows",
    windowsSupport: "Supported when WinGet is available",
    windowsChanges: "Installs VS Code, MSYS2 UCRT64 GCC/g++, Microsoft C/C++, adds the compiler and VS Code to your user PATH, and configures IntelliSense to use the compiler.",
    windowsCommand: "Set-ExecutionPolicy -Scope Process Bypass\n& \"$HOME\\Downloads\\install-cpp-vscode.ps1\"",
    mac: "macOS · Apple Silicon only",
    macSupport: "Intel Macs are not supported in this release",
    macChanges: "Installs or initializes Homebrew, VS Code, Microsoft C/C++, Homebrew GCC, and Apple Silicon IntelliSense defaults.",
    macCommand: "bash \"$HOME/Downloads/install-cpp-vscode-macos.sh\"",
    inspect: "What this script changes",
    viewSource: "View source",
    download: "Download installer",
    verify: "Success prints the compiler path and g++ --version. Open a new terminal if PATH still looks stale.",
    recoveryTitle: "Recovery notes",
    windowsRecovery: "If WinGet is missing, install App Installer from Microsoft. If a package or VS Code JSON step fails, fix that message and rerun the idempotent script. Restart the terminal after PATH changes.",
    macRecovery: "The script stops on a non-arm64 Mac. Fix Homebrew or network failures and rerun it. If settings JSON is invalid, repair that file first. A missing GCC path usually means Homebrew did not finish.",
    fallbackTitle: "Blocked? Finish class online.",
    fallback: "Use the USACO Guide IDE only as a last resort. It lets Intel Mac or temporarily blocked learners finish this class, but a local editor and compiler is the better long-term practice environment.",
    fallbackLink: "Open the USACO Guide IDE"
  },
  stonesLesson: {
    kicker: "Play break",
    title: "25 Stones.",
    intro: "Take one, two, or three stones on your turn. Whoever takes the final stone wins. Look for positions where every move gives the next player control.",
    optimalPlay: "If both players play optimally, Player 1 wins. Player 1 first takes one stone, leaving 24. After Player 2 takes one, two, or three stones, Player 1 takes enough to make their two moves remove four stones in total. Repeating this response leaves Player 1 to take the final stone."
  },
  codeforces: {
    kicker: "Judge workflow",
    title: "Understanding Codeforces.",
    intro: "This guided solution teaches the Judge workflow; Programming Fundamentals is where independent C++ instruction begins.",
    p2: "A submission bundles three decisions: the Problem, the source file, and the compiler. If any one is wrong, correct code can still receive a confusing result, so verify all three before pressing Submit.",
    p3: "The verdict is evidence, not a grade. Use it to choose the next debugging step: compilation failures point to the build, Wrong Answer points to logic or formatting, and runtime or time failures point to execution behavior.",
    signupTitle: "Create your Codeforces account",
    signupIntro: "Registration is free. Use an email address you can access and choose your handle carefully because it becomes your public identity on Codeforces.",
    signupStep1: "Open the Codeforces registration page and choose an available handle.",
    signupStep2: "Enter your email and create a strong password that you do not reuse on another service.",
    signupStep3: "Complete any verification shown by Codeforces and follow the account instructions it sends you.",
    signupStep4: "Sign in and open your profile to confirm that your handle and account are ready before the first Contest.",
    signupLink: "Create a Codeforces account",
    anatomyTitle: "Find your way around Codeforces",
    anatomyIntro: "These three areas organize different kinds of practice. Learn what each page is for before choosing a Problem so that you enter with the right goal and expectations.",
    contests: "Contests",
    contestsText: "Contests lists upcoming, current, and past competitions. Codeforces divisions group contests by their intended experience level: Div. 4 is the most approachable, Div. 3 is the next step, Div. 2 expects more experience, and Div. 1 is aimed at the strongest competitors. Start with a Div. 4 contest and focus on solving the early Problems; then move up when that level becomes comfortable. Some contests combine divisions or use different eligibility rules, so always read the individual contest announcement.",
    difficultyTitle: "How difficult is a contest?",
    difficultyText: "The contest division and rating eligibility indicate the intended participant range. Problem letters usually move from more approachable to more demanding, but the order is only a rough signal because difficulty depends on the ideas you recognize. After the contest, individual Problem ratings are a better guide for choosing practice near your current level.",
    gym: "Gym",
    gymText: "Gym contains archived and community sets, often arranged for ICPC-style or team practice. Its stars are a rough guide to the difficulty of the whole training session: 1 star is the most approachable, 2 stars suit developing teams, 3 stars are intermediate, 4 stars are advanced, and 5 stars mark the hardest sets. Start with a 1- or 2-star Gym and move up when your team can solve several Problems under time pressure. The rating describes the overall set, so individual Problems can still vary widely in difficulty.",
    problemset: "Problemset",
    problemsetText: "Problemset is the searchable catalog for individual practice. Filter by rating and tags, then read the statement, input, output, constraints, and samples before coding. After a serious attempt, use submissions and editorials to diagnose what you missed, then reimplement the idea yourself.",
    languageTitle: "Match source to compiler",
    cpp: "C++ source → GNU G++. Use a GNU C++ compiler so the submission matches the local g++ toolchain and supports <bits/stdc++.h>.",
    python: "Python source → Python 3 or PyPy 3. PyPy is another runtime for Python source, not another source language.",
    compilerList: "See Codeforces’ maintained compiler list",
    stepsTitle: "Your first submission",
    step1: "1 · Sign in and open Problem 4A, “Watermelon.”",
    step2: "2 · Copy the provided source into main.cpp.",
    step3: "3 · Compile locally. Input 8 must print YES.",
    windowsCompile: "Windows · PowerShell",
    windowsCompileCommand: "g++ -O2 -Wall main.cpp -o main.exe\n\"8\" | .\\main.exe",
    macCompile: "Apple Silicon · Terminal",
    macCompileCommand: "GXX=\"/opt/homebrew/bin/g++-$(brew list --versions gcc | awk 'NR == 1 { split($2, v, \".\"); print v[1] }')\"\n\"$GXX\" -O2 -Wall main.cpp -o main\nprintf '8\\n' | ./main",
    step4: "4 · Choose a GNU G++ compiler, then paste or upload the source.",
    step5: "5 · Submit and wait for the observable Accepted verdict.",
    problemLink: "Open Codeforces 4A",
    recoveryTitle: "Verdict recovery",
    recovery: "CE: confirm you selected GNU G++ and copied the complete source. WA: retest 8 → YES and 2 → NO. RTE: recopy the known solution. TLE: confirm you submitted this constant-time solution. If Codeforces is unavailable, preserve the source and finish the external step later."
  },
  practice: {
    kicker: "Habit",
    title: "How to practice.",
    intro: "Build problem-solving skills by solving many Problems through random Problemset work, live or virtual Contests, and team Gyms. Keep every unsolved Problem on a personal upsolving list until you understand it and can earn an Accepted verdict.",
    p2: "Choose Problems that are difficult enough to require a new observation but close enough that you can make progress. If every Problem is immediate, raise the difficulty; if every session ends without a concrete idea, temporarily narrow the gap.",
    p3: "For each unsolved Problem, record what you tried and where the reasoning failed. Then start reading the editorial and stop as soon as it gives you a new idea to explore. Try that idea yourself before reading further. Later, reimplement the solution without copying and explain why it meets the constraints before marking the item closed.",
    doctrine: "Attempt → record → learn → reimplement → accept",
    note: "Hints and editorials can support learning; copying an answer does not close the item. This personal list is a practice method, not a promise that ICPC Trainer can manually queue any Codeforces Problem today."
  },
  chompLesson: {
    kicker: "Capstone game",
    title: "Chomp.",
    intro: "Choose a chocolate square to remove it and everything below and to its right. The top-left square is poisoned: the player who chooses it loses immediately.",
    p2: "The important object is not the last bite but the shape that remains. Two move sequences that leave the same row lengths have reached the same state, so they should lead to the same winner with perfect play.",
    p3: "Reason backward from small boards. If a state has a safe move to a position where the next player must eventually lose, call it winning; if every safe move gives the opponent such a position, call it losing. Use that definition to evaluate the board without asking for a move."
  },
  future: {
    kicker: "Direction",
    title: "Your next ten Learning Topics.",
    intro: "This sequence previews the topics that will follow this Introduction. The guides are still being prepared and will become available later.",
    p2: "The topics reinforce one another. Complexity helps you reject approaches that cannot fit the limits; data structures make repeated operations cheaper; search, greedy reasoning, and dynamic programming organize different kinds of choices.",
    p3: "For now, keep this Introduction as a reference for the Judge loop and practice method, and reinforce it by writing small programs and solving beginner Problems.",
    available: "Available",
    future: "Future guide",
    fundamentals: "Fundamentals",
    complexity: "Complexity Theory",
    dataStructures: "Data Structures",
    bruteForce: "Brute Force",
    binarySearch: "Binary Search",
    dynamicProgramming: "Dynamic Programming",
    greedy: "Greedy",
    graphs: "Graphs",
    strings: "Strings",
    geometry: "Geometry"
  },
  games: {
    player: "Player {{player}}",
    active: "Player {{player}} to move",
    winner: "Player {{player}} wins",
    reset: "Reset game",
    showStrategy: "Explain how to reason about the winner",
    hideStrategy: "Hide winner explanation",
    invalid: "That move is outside the table or overlaps another plate. Player {{player}} still moves.",
    plate: {
      label: "{{width}} by {{height}} Plate Game board",
      mouseInstruction: "Choose the board width and height, then move the pointer over the board to preview a radius-one circle. Click or tap to place it; a red preview is not legal. From the keyboard, focus the board, move the preview with the arrow keys, and press Enter or Space to place it.",
      dimensions: "Board dimensions",
      width: "Board width",
      height: "Board height",
      resized: "Board changed to {{width}} by {{height}}. A new game has started.",
      moves: "{{count}} valid placements",
      placed: "Player {{player}} placed a plate. Player {{next}} moves next.",
      won: "Player {{player}} placed the final legal plate and wins.",
      strategy: "To reason about the winner, look for a symmetry or pairing that lets one player answer every legal move with another legal move. Replies then come in pairs. If a player can establish that pairing after one unpaired placement, that player controls who makes the final move. Test whether the pairing survives edges and overlaps instead of searching for a revealed coordinate."
    },
    stones: {
      label: "25 Stones game",
      remaining: "{{count}} stones remain",
      take: "Take {{count}}",
      moved: "Player {{player}} took {{count}}. Player {{next}} moves next.",
      won: "Player {{player}} took the final stone and wins.",
      lastMove: "Last move: {{count}} stones",
      strategy: "Classify pile sizes from smallest to largest. A pile is winning when some legal removal gives the opponent a losing pile, and losing when every removal gives the opponent a winning pile. The labels repeat in groups of four, so the starting label tells you which player can force the final stone without revealing the move to play."
    },
    chomp: {
      label: "5 by 7 Chomp board",
      square: "Row {{row}}, column {{column}}",
      poison: "Poison at row 1, column 1",
      remaining: "{{count}} chocolate squares remain",
      bite: "Player {{player}} bit row {{row}}, column {{column}}. Player {{next}} moves next.",
      poisoned: "Player {{player}} chose the poison. Player {{winner}} wins.",
      lastBite: "Last bite: row {{row}}, column {{column}}",
      strategy: "Represent a board by its remaining row lengths. A state is winning when at least one safe bite leads to a losing state, and losing when every safe bite leads to a winning state for the opponent. Work upward from tiny shapes to understand who can force the poison without revealing which square to choose.",
      winningState: "The player to move can force a win from this state.",
      losingState: "With perfect replies, the other player can force a win from this state.",
      finished: "The winner is already decided; reset to classify a new state."
    }
  },
  finish: {
    eyebrow: "Class complete",
    title: "Keep the loop moving.",
    description: "Mark this guide complete when you have followed the route. You can reopen it at any time; games always start fresh.",
    markComplete: "Mark guide complete",
    markProgress: "Move back to in progress",
    back: "Return to roadmap"
  },
  progress: {
    saveError: "Progress was not started",
    saveErrorDescription: "The guide is still fully available. Try again from the roadmap later.",
    completed: "Introduction completed",
    completedDescription: "Your roadmap now shows this guide as complete.",
    inProgress: "Introduction reopened",
    inProgressDescription: "Your roadmap now shows this guide as in progress.",
    updateError: "Progress was not updated",
    updateErrorDescription: "Your lesson and games are unchanged. Try the action again."
  }
} as const;
