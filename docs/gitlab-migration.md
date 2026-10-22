# GitLab repository and review context

The user authorized moving the active work to [wispd/ImmichPager](https://gitlab.com/wispd/ImmichPager). All 26 review branches were copied without rewriting history, and all 26 GitHub pull requests were recreated as merge requests targeting `dev`, preserving their descriptions, dependencies, validation evidence, and draft states. The [review index](../tasks/review.md) is the approval entry point; [the source mapping](../tasks/gitlab-review-map.json) records original commits and historical URLs. No GitHub issues, PR comments, reviews, or inline review comments existed to transfer.

The local `origin`, default push remote, and all review branch upstreams now use GitLab. The former GitHub origin remains named `github` for historical reference. Git operations use the existing `wispd` GitLab login from the operating-system keyring through `glab`; no credential was added to source files, URLs, descriptions, or commits.

GitLab's default branch remains `main`. Its stable commit `3f47be810a8cf95e59947562746de233e52a8289` and existing `v0.1.0` tag were preserved. `dev` received documentation updates only; feature work remains unmerged. The verified combined review is [draft !26](https://gitlab.com/wispd/ImmichPager/-/merge_requests/26). Its runtime retains the existing local verification evidence: 127 unit tests, 34 Chromium scenarios, 33 compatibility tests plus two compatibility browser checks, type checking, lint, formatting, audit, and build. GitLab created pipelines for CI-enabled merge requests, but they failed before creating any jobs: GitLab reports “The pipeline failed due to the user not being verified.” Account verification must be completed in GitLab before hosted checks can run. This is not a hosted CI pass; the local verification above remains the runtime evidence.

Historical v0.1.0 release downloads remain on GitHub so existing installation links work. This transfer does not publish images, create release tags, deploy the app, or approve a feature merge. The GitLab CI and registry configuration remains proposed in !6 and included in !26, pending feature approval. GitLab's registry destination is `registry.gitlab.com/wispd/immichpager`.

The fixture-only preview remains [client gallery](http://127.0.0.1:4400/page/acme) and [editor login](http://127.0.0.1:4400/dev-login/alice) on the review workstation. It uses no real client library.

## 2026-10-23 follow-up

Account verification is complete. MR !26 passed [GitLab pipeline #2976211992](https://gitlab.com/wispd/ImmichPager/-/pipelines/2976211992), including all verification checks and Docker startup/health smoke. With maintainer authorization, !26 and all 25 included prerequisite branches are now merged into `dev`. Release v0.2.0 is prepared from that verified feature set. `main` and the live deployment are unchanged. This supersedes the initial pipeline restriction and unmerged status above; the earlier paragraphs preserve the migration history.
