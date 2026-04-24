# PROJECT

- project_slug: shawn-web
- display_name: SHawn-WEB
- status: active-repo
- working_folder: /home/mdge/github/SHawn-WEB
- repo_name: SHawn-WEB
- main_session: proj-shawn-web
- source_of_truth: filesystem-first
- write_policy: limited-writeback

## Goal
Operate and evolve the SHawn web project repository under the shared github repo container.

## Core rules
- Files/folders are the source of truth.
- Canonical decisions remain explicit.
- Session/path declarations should prefer the canonical github path.
- `SHawn-WEB` route `/dashboard` is the canonical user-facing dashboard entrypoint.
- `SHawn-dashboard` remains the prototype/incubation repo and should not replace `/dashboard` as the default access surface.
- Stable dashboard features are promoted from `SHawn-dashboard` into this repository after validation.
