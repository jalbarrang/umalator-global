# TODO

## Old TODO list - From previous maintainer

- [x] draw velocity lines on course chart
  - [x] save min/max and allow different runs to be displayed
        make a best effort to save/estimate mean and median as well (e.g. using some (approximate?) on-line selection algorithm)

- [ ] we know how many runs we're doing in advance so can use some kind of on-line kth-min algorithm for median?
- [ ] other options: do some x% of the runs and then pick the next one that's closest to the observed mean/median
      found the latter easier.

- [x] integrated bashin chart
- [ ] skill hints/cost calculator?
- [x] show skill activations on course chart
- [ ] jp localization
- [ ] choose motivation
- [ ] choose popularity probably should involve un-splitting sirius unique, try to come up with a solution that also works for the bashin chart
- [ ] animations might be cool to animate e.g., the histogram bars popping up
- [ ] OCR to load umas from screenshots
- [ ] implement stamina/hp consumption
  - [x] implement in sim
  - [ ] also implement downhills
  - [ ] show downhill mode procs on race chart
  - [x] chart line
  - [ ] show % max spurt rate, average excess hp, etc possibly presented as another "tab" underneath the chart (tabbed with min/max/mean/median basinn gain tab)
  - [ ] eventually, stamina calculator mode
- [ ] unique skill levels also implement unique scaling in sim
- [x] run compare simulator in worker should probably not be run on the main UI thread
- [ ] cleanup
  - [ ] build system
        convert non-global to use build.mjs. refactor shared parts (most of it except the plugins and defines) to a common file.
        skill visualizer should also be changed to use this, and global skill visualizer can share the data intercept plugin
        with global umalator.
  - [ ] proper i18n
        i.e., remove the stupid CC_GLOBAL?'string1':'string2' bits in favor of the preact-i18n system used everywhere else
  - [x] change how order is handled
        it might be preferable to add an `order` member in RaceParameters to pass to skill conditions. the advantage here is we
        could filter out skills based on order more easily for the bashin chart instead of the kind of nasty cludge right now.
        (since we already filter out skills that place no triggers)

- [ ] probably requires rewriting CourseHelpers.isSortedByStart to assertIsSortedByStart or something (I don't think that
      function is used in any non-assertion contexts anyway)

### Miscellaneous

- [x] sort skills by disp_order from the db
- [x] add to unified skills.json
- [x] respond to url hash change events to load state
- [x] make the skill activation position tables on the right scroll when they run out of room instead of causing the viewport to scroll
- [x] race time selector
- [x] revert to mob by deleting uma name
- [x] text search for skill picker
- [x] presets for CM/LOH
- [ ] show pace down on chart?
- [ ] remove normal immutable.js and only used immutable-sorted (which also has Record, etc)
- [ ] selective imports for d3

* what else?
  - [ ] sprite sheet instead of loading individual images for icons and stuff
  - [ ] replace skills of the same group when one is added from the bashin chart
  - [ ] remove skills of the same group on uma2 when running bashin chart
  - [ ] pass seed to runComparison
    - bashin chart needs this to set a different seed between rounds
    - as it is currently each round repeats the prior round at the start since the seed is the same

### Bugs

- [x] shorter skills can overlap longer skills if the shorter skill is placed first
- [ ] need to check if b.start/end is within in r in addition to r within b
- [x] skill id is repeated on each alternative
- [x] tab order in expanded uma pane is wrong
- [x] expanding uma pane sets selected uma to 2
- [ ] expand button click bubbling up to tab click; need stopPropagation()
- [x] potential skill desync issues
- [ ] possibly having random skills on both umas that the other doesn't have can cause the activations for random skills that
      they DO both have to become desynced. need to look into this.
- [x] lock up after clicking min/max/etc in certain circumstances
      reproduce: https://alpha123.github.io/uma-tools/umalator/#H4sIAAAAAAAACtWPz2rDMAyH30VnH%2ByUQsitx7HLoMfRg0iUzDS2jP8QSsm7T%2FZaxvoGu0my9f0%2B3WHkEhO9TTAY3etegU%2FowkoJhqPWCkqiD07vRAGGHAspiDjSRDMMd3DMstgpWCIXXxkKNsL8RbHViTCxb2W2jh5fcaKapnehOzQVxCXPNlcLMPrQawOyHIgqsj%2BKRsrorEdpu2oVeGsRTXEpOT0fNpsmdtIddNuKmGm5CfZM%2FspFsJMVlh%2FpFLLNparAuaaVOOOf6Ql%2BAa%2Fjq11XyfwUW9E1cPm5pXu55Z9ccdn3b6%2Fl3rQJAgAA
- [ ] seirios ≤4 popularity version is unselectable
- [ ] annoying issue where sometimes it shows no skills as having activated even though I think they probably did? unsure, needs to be investigated
- [x] skills don't show on the chart if they're still active when the simulation ends the deactivate hook is never called
- [ ] all_corner_random bugged and sometimes seems to activate twice?
      reproduce: https://alpha123.github.io/uma-tools/umalator/#H4sIAAAAAAAACtWPwU7EMAxE%2F8XnHNJ2F0Fve0RckPaIOFitW6Jt4ihxVKHV%2FjtOACH4A262k3kzc4WJS8r0OMPY2Qd7ZyBk9HGjDOPRWgMl0zPnJ6IIo6RCBhJONNMC4xU8swp7A2viEirDwE4ob5TanAkzhzaK8%2FT1FWeqbvamdI9dBXGRxUlNAaCySFRh90cNkAW9C6hrX%2FNE3hu8hVuL5O%2BH3eWZvW6DbaqEQuu7As8ULlwUOztlhYlOUZyUGgLO1a2kBX9dT%2FAD%2BHu%2BuG1TzxdQ08PQwetni%2F7%2FthgOtcXtAwchUkMLAgAA
      (maximum)
- [x] greens aren't accounted for in hp calculation
      HpPolicy is instantiated before greens are activated; need some kind of explicit init(horse) method to set hp after the
      first round of skill activation
      reproduce: https://alpha123.github.io/uma-tools/umalator-global/#H4sIAAAAAAAACtWOzUoEMRCE36XPOSRRB5nbHkUQwaPsIUx6xuDkh6TDIMu8u937g%2BgbeKsuur6qE0y514ZPHkajBz0oSM3FsmKD8UFrBb3ha27PiAVGqh0VVDehxxnGE8ScOWgVLDX3JAwFGzr6wHrWDV3L6fxBIeL11XmUNr0zPTojoNxpDiQrADhWEAVmZUAjF0Nyt7PkTeCPopdOPPNe5Baaz%2FF6NKqOcPli2ktYkIk%2BMCZNeCgUqEs%2FvElRr7P75R7gJ%2F7X%2Fgzryn3vx8tw%2B%2B%2BGAw%2FRd5YtFuYmrLkIM2gDx33%2FBpiw3qEUAgAA

- [ ] skill id 104901111 always drains 100% stamina :simulator:
      as a result of no scaling being implemented
      this seems to be kind of weird since it does cause a fresh regression checkpoint to fail
