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

**Primary User**:
The main person whose judge activity the app tracks.
_Avoid_: Owner, account

**Friend**:
A non-primary user whose judge activity is also tracked for comparison or shared practice.
_Avoid_: Contact, peer

**Judge Credential**:
A saved secret or authentication artifact that lets ICPC Trainer access judge data for a **Primary User** on a **Judge**.
_Avoid_: Auth secret, account secret

**Synced Contest**:
A **Contest** whose judge metadata and problems have been imported into the app.
_Avoid_: Imported contest

**Unsynced Contest**:
A **Contest** known to the app but whose judge metadata and problems still need to be imported.
_Avoid_: Pending contest

**Judge Sync State**:
The backend-owned state of an active judge synchronization run, including whether it is running and its latest progress events.
_Avoid_: Frontend sync state, sync progress cache

## Example Dialogue

Dev: "Should sync fetch submissions for every Codeforces user?"

Domain expert: "Only for the Primary User and Friends. Teams and generic users are outside this sync."

Dev: "If a Submission references a missing Problem, do we create the Problem immediately?"

Domain expert: "No. Problems come from Contests. If enough missing Problems point to a Contest, sync that Contest, then retry the Submissions."
