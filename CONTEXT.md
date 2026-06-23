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
A user's attempt at a **Problem** on a **Judge**. A **User** may have many **Submissions** for the same **Problem**.
_Avoid_: Attempt, run

**Contest Participation**:
Evidence that a **User** participated in a **Contest**, without requiring problem-level **Submission** detail.
_Avoid_: Contest submission, partial submission

**Team User**:
A judge user whose submissions ICPC Trainer tracks for team practice and upsolving. Team Users are the only users whose submissions affect sync and upsolving status.
_Avoid_: Primary user, account user, teammate

**Friend**:
A judge user whose **Contest Participation** ranks **Contest Finder** results. Friends do not affect **Upsolving** status.
_Avoid_: Contact, peer

**Judge Credential**:
Saved authentication material that lets ICPC Trainer access a **Judge**. Judge Credentials are stored separately from **Team Users**.
_Avoid_: Account, primary user

**Judges Page**:
The app page where a user manages **Judge Credentials**.
_Avoid_: Account, primary user

**Simulated Contest**:
A **Contest** whose judge metadata and problems have been imported into the app.
_Avoid_: Imported contest

**Unsimulated Contest**:
A **Contest** known to the app but whose judge metadata and problems still need to be imported.
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

## Example Dialogue

Dev: "Should sync fetch submissions for every Codeforces user?"

Domain expert: "Only for Team Users. Friends and generic users are outside this sync."

Dev: "If a Submission references a missing Problem, do we create the Problem immediately?"

Domain expert: "No. Problems come from Contests. If enough missing Problems point to a Contest, sync that Contest, then retry the Submissions."

Dev: "Can QOJ profile contests count even when profile problem submissions are ambiguous?"

Domain expert: "Yes. Store Contest Participation for the Contest Finder, and only store Submissions when they match known Problems."
