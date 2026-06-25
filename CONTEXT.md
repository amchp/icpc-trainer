# ICPC Trainer

ICPC Trainer tracks competitive-programming judge data so local training views can reason about contests, problems, users, and submissions consistently across providers.

## Language

**Judge**:
An external competitive-programming platform that provides contests, problems, users, and submissions.
_Avoid_: Provider, online judge

**Contest**:
A judge-hosted collection of problems that should be trained or reviewed together.
_Avoid_: Round, gym

**Contest Stars**:
A numeric **Contest** difficulty rating. Higher values mean a harder **Contest**.
_Avoid_: Raw score, solved count

**Problem**:
A single task from a **Contest**. Each **Problem** belongs to exactly one **Contest** in the app.
_Avoid_: Task

**Submission**:
A **Judge User**'s attempt at a **Problem** on a **Judge**. A **Judge User** may have many **Submissions** for the same **Problem**.
_Avoid_: Attempt, run

**App User**:
A person signed into ICPC Trainer through Clerk. App Users own **Judge Credentials** and choose which **Judge Users** are Team Users or Friends for their workspace.
_Avoid_: User, judge account, handle

**Login Identity**:
A Google or GitHub identity managed and linked by Clerk for an **App User**.
_Avoid_: Judge Credential, provider credential

**Judge User**:
A canonical handle/profile on a **Judge**, shared globally by `(username, judge)`.
_Avoid_: App User, login, account user

**Contest Participation**:
Evidence that a **Judge User** participated in a **Contest**, without requiring problem-level **Submission** detail. Participation can support **Contest Finder**, but it does not make a **Contest** simulated unless distinct identified **Problems** are known.
_Avoid_: Contest submission, partial submission

**Team User**:
A **Judge User** attached to a specific **App User** for team practice and upsolving. Team Users are app-scoped roster relationships; the same **Judge User** can be Team for one **App User** and Friend for another.
_Avoid_: Primary user, account user, teammate

**Friend**:
A **Judge User** attached to a specific **App User** whose **Contest Participation** ranks **Contest Finder** results. Friends do not affect **Upsolving** status.
_Avoid_: Contact, peer

**Judge Credential**:
Saved authentication material owned by exactly one **App User** that lets ICPC Trainer access a **Judge**. Different **App Users** may save the same judge credential material, and credentials are stored separately from **Team Users**.
_Avoid_: Login Identity, primary user

**Judges Page**:
The app page where an **App User** manages **Judge Credentials**.
_Avoid_: Account, primary user

**Simulated Contest**:
A **Contest** that is simulated for a specific **Judge User** because that **Judge User** has submissions to at least two distinct identified **Problems** in that **Contest**. Simulation is shared through the canonical **Judge User**: if two **App Users** attach the same **Judge User**, they see the same simulated contests for that handle.
_Avoid_: Imported contest, participated contest

**Unsimulated Contest**:
A **Contest** known to the app but not simulated for the relevant **Judge User**.
_Avoid_: Pending contest

**Judge Sync State**:
The backend-owned state of an active judge synchronization run, including whether it is running and its latest progress events.
_Avoid_: Frontend sync state, sync progress cache

**Upsolving**:
Reviewing **Problems** from **Simulated Contests** using **Team User** **Submission** status and difficulty metrics.
_Avoid_: Gym view, contest split

**Contest Finder**:
The app page that ranks **Unsimulated Contests** using **Friend** **Contest Participation**.
_Avoid_: Gym finder

**Find Problems**:
The app page where a user browses saved Codeforces **Problems** by difficulty and tags, then selects a random visible **Problem** for practice.
_Avoid_: Problem finder, Codeforces catalog, practice picker

## Example Dialogue

Dev: "Should sync fetch submissions for every Codeforces user?"

Domain expert: "Only for Team Users. Friends and generic users are outside this sync."

Dev: "If a Submission references a missing Problem, do we create the Problem immediately?"

Domain expert: "No. Problems come from Contests. If enough missing Problems point to a Contest, sync that Contest, then retry the Submissions."

Dev: "Can QOJ profile contests count even when profile problem submissions are ambiguous?"

Domain expert: "Yes. Store Contest Participation for the Contest Finder, and only store Submissions when they match known Problems."
