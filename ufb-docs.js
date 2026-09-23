// UFB command guide, synchronized against the registered Discord schema.
window.UFB_DOCS = [
  {
    "title": "Identity & team management",
    "description": "Claim an EA name, register a club with or without a league, and manage its competition assignment and roster.",
    "commands": [
      {
        "name": "/ufb",
        "description": "Open your private UFB control panel for My Team, Free Agents and Stats. Existing league-focused slash commands remain available as shortcuts.",
        "examples": [
          "/ufb"
        ],
        "options": []
      },
      {
        "name": "/claim",
        "description": "Link your Discord identity to your EA player name. This is an identity claim, not a team signing or a requirement for future EA human-player stat sheets.",
        "options": [
          {
            "name": "player",
            "description": "EA player name",
            "type": 3,
            "required": true
          }
        ],
        "examples": [
          "/claim player:odez"
        ]
      },
      {
        "name": "/profile",
        "description": "View your EA identity and current UFB teams linked to your Discord account.",
        "examples": [
          "/profile"
        ],
        "options": []
      },
      {
        "name": "/register",
        "description": "Register a new team and become its manager. The league is optional: leave it blank to create an independent club, link its EA club, and assign it to an open league later with /team assign.",
        "options": [
          {
            "name": "team",
            "description": "Team name",
            "type": 3,
            "required": true
          },
          {
            "name": "league",
            "description": "Optional open league; assign one later with /team assign",
            "type": 3,
            "autocomplete": true
          }
        ],
        "examples": [
          "/register team:UFL Como",
          "/register team:UFL Como league:UNC 6v6"
        ]
      },
      {
        "name": "/sign",
        "description": "The registered team’s manager adds a Discord player to the roster. A successful signing removes free-agent availability only for that team’s league, including All-competition listings. That league’s dedicated auto-post is deleted; shared-channel posts are updated to retain remaining availability. Other leagues and BYOT cups stay available. Players can belong to one team per league, while playing separately in 6v6 and 10v10. Release the existing membership before transferring within a league.",
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "member",
            "description": "Discord player",
            "type": 6,
            "required": true
          }
        ],
        "examples": [
          "/sign league:unc-6v6 team:UFL Como member:@Alex"
        ]
      },
      {
        "name": "/release",
        "description": "The team’s manager removes a player from this roster. A release does not automatically reopen an old free-agent listing; the player can submit a fresh /recruit freeagent signup.",
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "member",
            "description": "Discord player",
            "type": 6,
            "required": true
          }
        ],
        "examples": [
          "/release league:unc-6v6 team:UFL Como member:@Alex"
        ]
      },
      {
        "name": "/roster",
        "description": "Show the selected team’s current members, manager and claimed EA names, where available.",
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/roster league:unc-6v6 team:UFL Como"
        ]
      },
      {
        "name": "/team view",
        "description": "Show the selected active team’s league assignment, manager, roster count and EA club link status. Unassigned clubs remain selectable.",
        "options": [
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/team view team:UFL Como — Unassigned"
        ]
      },
      {
        "name": "/team assign",
        "description": "Place an assigned or unassigned team into a league while preserving its manager, roster, EA link and history. Team managers may choose an open league; UFB Administrators may also assign into a closed active league. Same-league roster protection is checked before the move.",
        "options": [
          {
            "name": "team",
            "description": "Choose an assigned or unassigned team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "league",
            "description": "Destination league",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "confirm",
            "description": "Confirm this league assignment",
            "type": 5,
            "required": true
          }
        ],
        "examples": [
          "/team assign team:UFL Como — Unassigned league:UNC 6v6 confirm:true"
        ]
      },
      {
        "name": "/team unassign",
        "description": "Remove a team from its current league without dissolving it. The manager, roster, EA link and historical records remain; the club can later be assigned to another league.",
        "options": [
          {
            "name": "team",
            "description": "Choose an assigned team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "confirm",
            "description": "Confirm removal from the league",
            "type": 5,
            "required": true
          }
        ],
        "examples": [
          "/team unassign team:UFL Como — UNC 6v6 confirm:true"
        ]
      },
      {
        "name": "/team dissolve",
        "description": "Permanently close a team. The team manager may dissolve their own team, and a UFB Administrator may dissolve any team. This releases its roster, closes recruiting and match monitoring, removes the EA link and hides the team from active selectors while preserving historical matches and competition records.",
        "options": [
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "confirm",
            "description": "Required confirmation that this team should be dissolved",
            "type": 5,
            "required": true
          }
        ],
        "examples": [
          "/team dissolve team:UFL Como — UNC 6v6 confirm:true"
        ]
      }
    ]
  },
  {
    "title": "Draft nights",
    "description": "Create a pool, appoint captains and draft exclusive squads in snake or round-robin order. Picks are checked atomically against the live pool.",
    "commands": [
      {
        "name": "/draft create",
        "description": "A Manager-role member creates an open draft pool, with snake or round-robin pick order and optional rules. Create the draft before adding its captains.",
        "options": [
          {
            "name": "name",
            "description": "Draft name",
            "type": 3,
            "required": true,
            "max_length": 80
          },
          {
            "name": "mode",
            "description": "Pick order",
            "type": 3,
            "choices": [
              {
                "name": "Snake",
                "value": "snake"
              },
              {
                "name": "Round robin",
                "value": "round_robin"
              }
            ]
          },
          {
            "name": "rules",
            "description": "Draft rules",
            "type": 3,
            "max_length": 1000
          }
        ],
        "examples": [
          "/draft create name:Friday Draft mode:snake rules:Two captains, equal squads"
        ]
      },
      {
        "name": "/draft captain",
        "description": "The draft creator adds a named side and its Discord captain. Repeat for each side before starting; captains are included on their sides.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "side",
            "description": "Side name",
            "type": 3,
            "required": true
          },
          {
            "name": "member",
            "description": "Captain",
            "type": 6,
            "required": true
          }
        ],
        "examples": [
          "/draft captain draft:Friday Draft side:Blue member:@Alex",
          "/draft captain draft:Friday Draft side:Red member:@Sam"
        ]
      },
      {
        "name": "/draft start",
        "description": "The draft creator closes joining and starts captain picks. Captains then use /draft pick on their side’s turn.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft start draft:Friday Draft"
        ]
      },
      {
        "name": "/draft panel",
        "description": "Open a private control panel with Join / Leave Pool, View Pool, Squads and Recap buttons. Captains gain a pick button once drafting starts; the creator gains Start Draft. Permissions and draft state are checked again on every click.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft panel draft:Friday Draft"
        ]
      },
      {
        "name": "/draft join",
        "description": "Join the selected draft while its player pool is open. Your Discord identity is the entry; no separate player name is needed.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft join draft:Friday Draft"
        ]
      },
      {
        "name": "/draft leave",
        "description": "Leave the selected draft while joining is open. Captains cannot leave their assigned sides through this command.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft leave draft:Friday Draft"
        ]
      },
      {
        "name": "/draft pool",
        "description": "View the players who remain undrafted. Use page to browse large pools before making a pick.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "page",
            "description": "Available-player page",
            "type": 4,
            "min_value": 1
          }
        ],
        "examples": [
          "/draft pool draft:Friday Draft page:1"
        ]
      },
      {
        "name": "/draft squads",
        "description": "View the sides, captains and players already drafted into each squad.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft squads draft:Friday Draft"
        ]
      },
      {
        "name": "/draft recap",
        "description": "View the recorded pick order and final or in-progress squad selections.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft recap draft:Friday Draft"
        ]
      },
      {
        "name": "/draft pick",
        "description": "On your side’s turn, open the live undrafted-player selector. A successful pick immediately removes the player from every team’s available pool. Old menus cannot draft someone twice or bypass turn order. Use page for pools above 25 players; the creator can pick on a side’s behalf.",
        "options": [
          {
            "name": "draft",
            "description": "Choose a draft in this server",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "page",
            "description": "Available-player page",
            "type": 4,
            "min_value": 1
          },
          {
            "name": "side",
            "description": "Organizer override: choose a side",
            "type": 3,
            "required": false,
            "autocomplete": true
          }
        ],
        "examples": [
          "/draft pick draft:Friday Draft page:1",
          "/draft pick draft:Friday Draft side:Blue"
        ]
      }
    ]
  },
  {
    "title": "Cups & BYOT",
    "description": "Run knockout, random draw, league or league + knockout competitions. Managers report scores; opponents confirm or dispute them.",
    "commands": [
      {
        "name": "/cup list",
        "description": "List available UFB competitions so you can find the cup to enter or manage.",
        "examples": [
          "/cup list"
        ],
        "options": []
      },
      {
        "name": "/cup panel",
        "description": "Open your private cup overview: entrants, current stage and a league table calculated from confirmed results. Buttons show fixtures, refresh the table and let the creator advance a completed stage. Omit cup to use the administrator-configured default. Authorized organizers receive management controls.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": false,
            "autocomplete": true
          }
        ],
        "examples": [
          "/cup panel cup:Summer Cup"
        ]
      },
      {
        "name": "/cup fixtures",
        "description": "Show fixtures, their IDs and result/confirmation status. Use the actual fixture ID from here in submit, confirm or resolve—not the example number.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "page",
            "description": "Available-player page",
            "type": 4,
            "min_value": 1
          }
        ],
        "examples": [
          "/cup fixtures cup:Summer Cup page:1"
        ]
      },
      {
        "name": "/cup submit",
        "description": "An involved team manager reports a fixture’s home and away scores for the opposing manager to confirm. Keep the fixture’s listed home/away order, even when your team is away.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "match_id",
            "description": "Fixture ID from /cup fixtures",
            "type": 4,
            "required": true,
            "min_value": 1
          },
          {
            "name": "home_score",
            "description": "Home team score",
            "type": 4,
            "required": true,
            "min_value": 0
          },
          {
            "name": "away_score",
            "description": "Away team score",
            "type": 4,
            "required": true,
            "min_value": 0
          }
        ],
        "examples": [
          "/cup submit cup:Summer Cup match_id:12 home_score:3 away_score:1"
        ]
      },
      {
        "name": "/cup resolve",
        "description": "The competition creator records or resolves an official score for a missing or disputed fixture. This is an organizer action, not a player’s normal submission.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "match_id",
            "description": "Fixture ID from /cup fixtures",
            "type": 4,
            "required": true,
            "min_value": 1
          },
          {
            "name": "home_score",
            "description": "Home team score",
            "type": 4,
            "required": true,
            "min_value": 0
          },
          {
            "name": "away_score",
            "description": "Away team score",
            "type": 4,
            "required": true,
            "min_value": 0
          }
        ],
        "examples": [
          "/cup resolve cup:Summer Cup match_id:12 home_score:3 away_score:1"
        ]
      },
      {
        "name": "/cup confirm",
        "description": "The opposing manager confirms or disputes a submitted score. The submitting manager cannot confirm their own report.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "match_id",
            "description": "Fixture ID from /cup fixtures",
            "type": 4,
            "required": true,
            "min_value": 1
          },
          {
            "name": "decision",
            "description": "Confirm the score or dispute it",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Confirm",
                "value": "confirm"
              },
              {
                "name": "Dispute",
                "value": "dispute"
              }
            ]
          }
        ],
        "examples": [
          "/cup confirm cup:Summer Cup match_id:12 decision:confirm",
          "/cup confirm cup:Summer Cup match_id:12 decision:dispute"
        ]
      },
      {
        "name": "/cup advance",
        "description": "The competition creator advances a completed stage. For league + knockout, optional seeds are qualifying cup entry IDs in seeding order; use real entrant IDs, not team names.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "seeds",
            "description": "Optional qualifying entry IDs in order, comma-separated",
            "type": 3
          }
        ],
        "examples": [
          "/cup advance cup:Summer Cup",
          "/cup advance cup:Summer Cup seeds:1,4,2,3"
        ]
      },
      {
        "name": "/cup create",
        "description": "A Manager-role member creates a cup with UFB-team or BYOT entries. Choose knockout, random draw, league, or league + knockout. Registration starts open; the creator later closes it and selects qualifiers where needed.",
        "options": [
          {
            "name": "name",
            "description": "Cup name",
            "type": 3,
            "required": true
          },
          {
            "name": "entry_type",
            "description": "Who can enter",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "UFB teams",
                "value": "team"
              },
              {
                "name": "BYOT — bring your own team",
                "value": "byot"
              }
            ]
          },
          {
            "name": "format",
            "description": "Cup format",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Knockout",
                "value": "knockout"
              },
              {
                "name": "Random draw knockout",
                "value": "draw"
              },
              {
                "name": "League",
                "value": "league"
              },
              {
                "name": "League + knockout",
                "value": "league_knockout"
              }
            ]
          }
        ],
        "examples": [
          "/cup create name:Summer Cup entry_type:byot format:knockout",
          "/cup create name:League Cup entry_type:byot format:league",
          "/cup create name:League Finals entry_type:byot format:league_knockout",
          "/cup create name:Draw Cup entry_type:byot format:draw"
        ]
      },
      {
        "name": "/cup register",
        "description": "Enter an open cup with your UFB team or a BYOT team name, depending on its entry type. Select the actual cup from the suggestions.",
        "options": [
          {
            "name": "cup",
            "description": "Choose an open cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "entry",
            "description": "Your UFB team or BYOT team name",
            "type": 3,
            "required": true
          }
        ],
        "examples": [
          "/cup register cup:Summer Cup entry:UFL Como"
        ]
      },
      {
        "name": "/cup bracket",
        "description": "View the selected cup’s registered entrants or generated knockout bracket.",
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/cup bracket cup:Summer Cup"
        ]
      },
      {
        "name": "/cup close",
        "description": "The creator closes entries and generates fixtures for knockout, random draw or round-robin league play. For league + knockout, manually enter an even qualifiers count; the bot never chooses it for you. Non-power-of-two knockout fields receive real-team byes.",
        "options": [
          {
            "name": "cup",
            "description": "Choose your cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "qualifiers",
            "description": "League + knockout only; even number advancing",
            "type": 4,
            "required": false
          }
        ],
        "examples": [
          "/cup close cup:Summer Cup",
          "/cup close cup:League Finals qualifiers:8"
        ]
      },
      {
        "name": "/cup withdraw",
        "description": "Withdraw your own team entry before fixtures have been generated. Once fixtures exist, entrants are locked to protect the bracket.",
        "examples": [
          "/cup withdraw cup:summer-cup"
        ],
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/cup pause",
        "description": "Authorized organizer: pause signups without generating fixtures. This allows registration to be reopened safely later.",
        "examples": [
          "/cup pause cup:summer-cup"
        ],
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/cup reopen",
        "description": "Authorized organizer: resume registration for a paused cup. Reopening is blocked after fixtures exist or the cup is cancelled.",
        "examples": [
          "/cup reopen cup:summer-cup"
        ],
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/cup cancel",
        "description": "Authorized organizer or server administrator: cancel the event with explicit confirmation. Entries and recorded results are preserved as read-only history.",
        "examples": [
          "/cup cancel cup:summer-cup confirm:true"
        ],
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "confirm",
            "description": "Confirm cancellation; entries and results are preserved",
            "type": 5,
            "required": true
          }
        ]
      },
      {
        "name": "/cup organizer",
        "description": "Cup creator or server administrator: grant another member management access for this cup, or remove it. Delegates can manage registration, resolve results and advance stages; they cannot appoint other organizers.",
        "examples": [
          "/cup organizer cup:summer-cup member:@Alex"
        ],
        "options": [
          {
            "name": "cup",
            "description": "Choose a cup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "member",
            "description": "Organizer",
            "type": 6,
            "required": true
          },
          {
            "name": "remove",
            "description": "Remove instead of grant access",
            "type": 5
          }
        ]
      }
    ]
  },
  {
    "title": "Recruiting & free agents",
    "description": "Find players or a club. Free agents list their top three, backup and unwanted positions with a short pitch. No values, OVR or tiers.",
    "commands": [
      {
        "name": "/recruit fa list",
        "description": "Team Manager or Discord administrator: open a private summary of active free agents grouped by leagues created in this server. Players available in multiple divisions appear under each applicable division; signed, excluded and expired availability is omitted.",
        "examples": [
          "/recruit fa list"
        ],
        "options": []
      },
      {
        "name": "/recruit club",
        "description": "Post a recruitment listing for your team",
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Your UFB team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "positions",
            "description": "Positions needed, e.g. GK, CB, CM",
            "type": 3,
            "required": true
          },
          {
            "name": "contact",
            "description": "Discord contact, e.g. @name",
            "type": 3,
            "required": true
          },
          {
            "name": "pitch",
            "description": "Short pitch for your club",
            "type": 3,
            "required": true
          }
        ],
        "examples": [
          "/recruit club league:unc-6v6 team:UFL Como positions:GK, CB, CM contact:@Dezimio pitch:Relaxed club looking for reliable players"
        ]
      },
      {
        "name": "/recruit freeagent",
        "description": "Choose from leagues created in this server: league_1 is required, and league_2 and league_3 are optional. Choose All active leagues by itself to be listed across current divisions. If the server has no leagues yet, an administrator must create one with /setup create. Complete your positions, contact and pitch_availability (short pitch plus days/times and timezone) to publish. The command confirmation is private, so it does not create another public listing in the channel where the command was entered. Public listings automatically go only to configured league channels and notify @here plus the configured Team Manager role. Notifications occur only on a newly published, renewed or edited listing—not when that post is later updated, signed or expired. When a manager signs the player, availability is removed only for that team's league. Dedicated channel posts are removed; shared posts retain any other league availability. Releasing a player does not automatically reopen their listing. Listings expire after seven days; /recruit renew bumps the post and /recruit edit updates it.",
        "options": [
          {
            "name": "league_1",
            "description": "Choose a league created in this server or All active leagues",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "primary",
            "description": "Your top three positions",
            "type": 3,
            "required": true
          },
          {
            "name": "backup",
            "description": "Backup positions",
            "type": 3,
            "required": true
          },
          {
            "name": "avoid",
            "description": "Positions you do not want to play",
            "type": 3,
            "required": true
          },
          {
            "name": "contact",
            "description": "Discord contact, e.g. @name",
            "type": 3,
            "required": true
          },
          {
            "name": "pitch_availability",
            "description": "Pitch and availability: about you, days/times and timezone",
            "type": 3,
            "required": true
          },
          {
            "name": "league_2",
            "description": "Optional second active league",
            "type": 3,
            "autocomplete": true
          },
          {
            "name": "league_3",
            "description": "Optional third competition when more are available",
            "type": 3,
            "autocomplete": true
          }
        ],
        "examples": [
          "/recruit freeagent league_1:6v6 primary:CM, CAM, ST backup:CB avoid:GK contact:@Alex pitch_availability:Passing midfielder; Mon/Wed 8–10 PM CT",
          "/recruit freeagent league_1:6v6 league_2:10v10 primary:CM, CAM, ST backup:CB avoid:GK contact:@Alex pitch_availability:Team-first player; weekdays after 8 PM CT",
          "/recruit freeagent league_1:All competitions primary:CM, CAM, ST backup:CB avoid:GK contact:@Alex pitch_availability:Flexible player; weekends 7–11 PM CT"
        ]
      },
      {
        "name": "/recruit channel",
        "description": "Discord owner/admin setup: assign a free-agent channel for each active league. Repeat for 6v6 and 10v10. Omit channel to view the assignment and failed delivery count; use clear:true to disable it. New completed listings auto-post to their selected league channels; All active leagues posts to every configured eligible league. Shared channels receive one copy. Each new, renewed or edited listing notifies @here and the Team Manager role configured in /setup; later updates do not repeat the ping. Existing listings are not bulk-posted when a channel is assigned. UFB needs View Channel, Send Messages, Embed Links and Mention @everyone, @here, and All Roles permissions there. Deliveries retry temporary errors; closed or replaced listings preserve their history.",
        "examples": [
          "/recruit channel competition:6v6 channel:#free-agents-6v6",
          "/recruit channel competition:6v6",
          "/recruit channel competition:6v6 clear:true"
        ],
        "options": [
          {
            "name": "competition",
            "description": "Choose an active league",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "channel",
            "description": "Discord channel for automatic free-agent posts",
            "type": 7,
            "channel_types": [
              0,
              5
            ]
          },
          {
            "name": "clear",
            "description": "Remove the competition channel assignment",
            "type": 5
          }
        ]
      },
      {
        "name": "/recruit browse",
        "description": "View active club or free-agent posts. For free agents, use the optional competition selector to filter by 6v6 or 10v10. All-active-leagues listings appear in both league results unless rostered.",
        "options": [
          {
            "name": "type",
            "description": "What to browse",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Clubs recruiting",
                "value": "club"
              },
              {
                "name": "Free agents",
                "value": "free_agent"
              }
            ]
          },
          {
            "name": "competition",
            "description": "Filter free agents by active league",
            "type": 3,
            "autocomplete": true
          }
        ],
        "examples": [
          "/recruit browse type:free_agent competition:6v6",
          "/recruit browse type:free_agent competition:10v10",
          "/recruit browse type:club"
        ]
      },
      {
        "name": "/recruit close",
        "description": "Close your own active club or free-agent listing. Closing a free-agent listing removes all its competition availability and marks its auto-posted channel copies closed; use /sign for league-specific removal instead.",
        "options": [
          {
            "name": "type",
            "description": "Post to remove",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Club post",
                "value": "club"
              },
              {
                "name": "Free-agent post",
                "value": "free_agent"
              }
            ]
          }
        ],
        "examples": [
          "/recruit close type:free_agent",
          "/recruit close type:club"
        ]
      },
      {
        "name": "/recruit renew",
        "description": "Bump your most recent free-agent listing and restart its seven-day window. Current roster membership is rechecked; your previous channel listing is retired.",
        "examples": [
          "/recruit renew"
        ],
        "options": []
      },
      {
        "name": "/recruit edit",
        "description": "Change any supplied positions, contact, pitch/availability or competitions. Omitted fields are preserved. A fresh seven-day listing replaces the previous post.",
        "examples": [
          "/recruit edit pitch_availability:Available Mondays and Thursdays after 8 PM CT"
        ],
        "options": [
          {
            "name": "league_1",
            "description": "Choose a league created in this server or All active leagues",
            "type": 3,
            "required": false,
            "autocomplete": true
          },
          {
            "name": "primary",
            "description": "Your top three positions",
            "type": 3,
            "required": false
          },
          {
            "name": "backup",
            "description": "Backup positions",
            "type": 3,
            "required": false
          },
          {
            "name": "avoid",
            "description": "Positions you do not want to play",
            "type": 3,
            "required": false
          },
          {
            "name": "contact",
            "description": "Discord contact, e.g. @name",
            "type": 3,
            "required": false
          },
          {
            "name": "pitch_availability",
            "description": "Pitch and availability: about you, days/times and timezone",
            "type": 3,
            "required": false
          },
          {
            "name": "league_2",
            "description": "Optional second active league",
            "type": 3,
            "autocomplete": true,
            "required": false
          },
          {
            "name": "league_3",
            "description": "Optional third competition when more are available",
            "type": 3,
            "autocomplete": true,
            "required": false
          }
        ]
      },
      {
        "name": "/recruit sign",
        "description": "Team manager: select a league and team, then choose up to 10 Discord members from a private multi-user picker. Players do not need /claim; same-league roster protection is checked separately for every selection.",
        "examples": [
          "/recruit sign league:unc-6v6 team:UFL Como"
        ],
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Your registered team",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      }
    ]
  },
  {
    "title": "Matches & player statistics",
    "description": "EA FC 27 club linking, recent matches and automatic human-player match sheets are live for testing. Manual reporting remains available separately.",
    "commands": [
      {
        "name": "EA FC 27 club integration",
        "status": "Live testing",
        "description": "Club search, real league/playoff match ingestion and automatic per-match posts are connected through the verified FC27 relay. A league and registered team are required before linking the EA club.",
        "examples": []
      },
      {
        "name": "Verified FC27 match stat lines",
        "status": "Live testing",
        "description": "Match images print only verified FC27 fields: position, rating, goals, shots, assists, passing and tackling success, interceptions, saves and EA's official Man of the Match. Every human player returned by the match feed can be included; Discord player registration is not required.",
        "examples": []
      },
      {
        "name": "Match-sheet presentation",
        "status": "Implemented",
        "description": "Per-match images use automatic EA club crests, the approved muted overlay and the six available football backgrounds. League game stats produce a separate readable image for each team.",
        "examples": []
      },
      {
        "name": "/linkclub",
        "description": "Find and link your team’s real EA club. The team can be unassigned; league registration is not required for the EA link.",
        "status": "FC27 live",
        "options": [
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "club",
            "description": "Exact EA club name",
            "type": 3,
            "required": true
          },
          {
            "name": "platform",
            "description": "EA platform group",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "PS5 / Xbox Series / PC",
                "value": "common-gen5"
              },
              {
                "name": "PS4 / Xbox One",
                "value": "common-gen4"
              }
            ]
          }
        ],
        "examples": [
          "/linkclub team:UFL Como — Unassigned club:UFL Como platform:common-gen5"
        ]
      },
      {
        "name": "/matches",
        "description": "Show the selected linked club’s three most recent verified FC27 results with real-player scorers, assists and human-player totals. Preview any full image sheet privately, then choose a Discord text or announcement channel if you want to publish it. Nothing posts publicly before that final selection.",
        "status": "FC27 live",
        "options": [
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/matches team:UFL Como — Unassigned"
        ],
        "preview": {
          "src": "/assets/ufb-example-match-sheet.png",
          "alt": "Example UFB FC27 player stat sheet with verified match statistics",
          "caption": "Example private preview. Select Publish in Discord to send the finished PNG to a chosen registered channel."
        }
      },
      {
        "name": "/playerstats",
        "description": "View overall FC27 Pro Clubs totals for a claimed EA player. The bot finds that EA name on every Pro Club currently linked to UFB and combines games, goals, assists, average rating, Man of the Match awards, clean sheets and cards. This is separate from official UFB league-only leaders.",
        "options": [
          {
            "name": "member",
            "description": "Discord player (defaults to you)",
            "type": 6,
            "required": false
          }
        ],
        "examples": [
          "/playerstats",
          "/playerstats member:@Alex"
        ]
      },
      {
        "name": "/gamestats",
        "description": "Select a league and two linked registered teams. UFB searches the FC27 feed for their head-to-head game and publishes two separate images—one complete player-stat sheet for each team. Use this after a gameweek as a backup when managers did not publish their own match sheets. Optionally choose a verified recent match from Discord’s picker; no score or match ID needs to be typed. Every report automatically uses one random approved background for both team sheets.",
        "status": "FC27 live · Demo available",
        "examples": [
          "/gamestats league:unc-6v6 team_a:UFL Como team_b:UFL Bayern timeout:15",
          "/gamestats league:unc-6v6 team_a:UFL Como team_b:UFL Bayern demo:true"
        ],
        "preview": {
          "src": "/assets/ufb-example-match-sheet.png",
          "alt": "Example UFB FC27 game-stat image for one team",
          "caption": "Example of one team’s sheet. /gamestats publishes two separate images—one readable sheet for each linked club."
        },
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team_a",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team_b",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "timeout",
            "description": "Minutes to wait for EA updates (default 15)",
            "type": 4,
            "min_value": 5,
            "max_value": 60
          },
          {
            "name": "match_id",
            "description": "Optional recent head-to-head match",
            "type": 3,
            "autocomplete": true
          },
          {
            "name": "demo",
            "description": "Manager-only: fictional PNG test; no live records changed",
            "type": 5
          }
        ]
      },
      {
        "name": "/automode start",
        "description": "A team manager or Manager-role member selects a linked FC 27 team and starts automatic per-match PNG posts in this channel. It checks about once a minute, includes the previous 15 minutes on its first scan to absorb EA reporting delays, and posts every newly detected league or playoff match exactly once. Each successful post restarts the inactivity timer. Every match automatically uses a random one of the six approved backgrounds. Only human participants reported by the club feed are included—no /claim or player registration required. Select idle_minutes (15–240, default 60). Monitoring ends after that period without a newly posted match. Statistics unavailable from EA remain visibly unavailable; no values are invented.",
        "status": "FC27 live",
        "examples": [
          "/automode start team:UFL Como — UNC 6v6 idle_minutes:60"
        ],
        "preview": {
          "src": "/assets/ufb-example-match-sheet.png",
          "alt": "Example automatic FC27 per-match player stat sheet",
          "caption": "Example automatic per-match post. Each newly detected game uses this format with a random approved background by default and live EA data."
        },
        "options": [
          {
            "name": "team",
            "description": "Choose a linked team (competition shown in suggestions)",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "idle_minutes",
            "description": "Stop after this many minutes without a new match (default 60)",
            "type": 4,
            "min_value": 15,
            "max_value": 240
          }
        ]
      },
      {
        "name": "/automode stop",
        "description": "The team manager or Manager-role member stops that team's automatic monitoring in the current channel.",
        "examples": [
          "/automode stop team:UFL Como — UNC 6v6"
        ],
        "options": [
          {
            "name": "team",
            "description": "Choose a linked team (competition shown in suggestions)",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/automode status",
        "description": "Show active automatic watchers in this channel, their inactivity deadlines and whether a detection or rendering check is unavailable.",
        "examples": [
          "/automode status"
        ],
        "options": []
      }
    ]
  },
  {
    "title": "Match nights & official leagues",
    "description": "Post availability RSVPs and select official leagues. Some league data integrations are still planned.",
    "commands": [
      {
        "name": "/matchnight",
        "description": "The team’s manager posts a match-night RSVP with Yes, Tentative and No buttons. Include an understandable date, time and timezone in starts_at.",
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "team",
            "description": "Select the team and competition from suggestions",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "starts_at",
            "description": "Example: Tonight 8:30 PM CT",
            "type": 3,
            "required": true
          }
        ],
        "examples": [
          "/matchnight league:unc-6v6 team:UFL Como starts_at:Friday 8:30 PM CT"
        ]
      },
      {
        "name": "/standings",
        "description": "Select a league created in this Discord server. If an administrator linked its compatible website feed with /setup leaguesource, generate a standings image with team crests and published data. An unlinked league shows its registration table.",
        "status": "Linked website season · Otherwise registration",
        "options": [
          {
            "name": "league",
            "description": "Choose an official UNC league",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ],
        "examples": [
          "/standings league:UNC 6v6 — Season 1"
        ],
        "preview": {
          "src": "/assets/ufb-example-standings.png",
          "alt": "Example UFB official league standings image",
          "caption": "Example standings image generated from the latest published website league data."
        }
      },
      {
        "name": "/schedule",
        "description": "Choose a league created in this Discord server. If its administrator linked a compatible website feed with /setup leaguesource, show its latest fixtures and results. Each league has its own source setting.",
        "examples": [
          "/schedule league:UNC 6v6 — Season 1",
          "/schedule league:UNC 6v6 — Season 1 week:4"
        ],
        "options": [
          {
            "name": "league",
            "description": "Choose a league configured in this Discord server",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "week",
            "description": "Matchweek; defaults to the next unplayed week",
            "type": 4,
            "min_value": 1
          }
        ]
      },
      {
        "name": "/leaguestats",
        "description": "Select a league created in this Discord server. A league linked to a compatible website feed with /setup leaguesource generates a three-column image of its top five players for goals, assists and average match rating. The ranking is separate from overall EA Pro Clubs totals in /playerstats.",
        "examples": [
          "/leaguestats league:UNC 6v6 — Season 1"
        ],
        "preview": {
          "src": "/assets/ufb-example-league-leaders.png",
          "alt": "Example UFB league leaders image showing goals assists and average match rating",
          "caption": "Example league-leaders image: top five goals, assists and average match rating."
        },
        "options": [
          {
            "name": "league",
            "description": "Choose a league configured in this Discord server",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      }
    ]
  },
  {
    "title": "Administrator setup",
    "description": "One private place to configure UFB. Setup controls are restricted to administrators; full data reset is restricted to the Discord server owner or bot application owner.",
    "commands": [
      {
        "name": "/info reset",
        "description": "Discord server owner or bot application owner only: privately preview a complete reset of the current Discord server’s saved UFB data, then pass two separate confirmations. Discord supplies the server ID automatically, and the reset is restricted to records owned by that exact ID; data in every other server is preserved. It deletes this server’s leagues, teams, rosters, player claims, recruiting records, match data, jobs and setup data. Slash commands, bot code, installation permissions and backgrounds remain installed. Existing Discord channels and messages are not deleted.",
        "examples": [
          "/info reset"
        ],
        "options": []
      },
      {
        "name": "/setup panel",
        "description": "Discord Administrator or configured UFB Administrator: open the private setup panel for staff roles, competition defaults, free-agent publishing channels, Help Center and current EA feed configuration.",
        "examples": [
          "/setup panel"
        ],
        "options": []
      },
      {
        "name": "/setup roles",
        "description": "Post-install onboarding: choose separate Discord roles for UFB Administrator, Moderator and Team Manager from guided role selectors. UFB Administrators control bot setup; Moderators receive league-oversight access; Team Managers handle teams, rosters and recruiting. Only a real Discord server Administrator can assign or replace the UFB Administrator role.",
        "examples": [
          "/setup roles"
        ],
        "options": []
      },
      {
        "name": "/setup helpcenter",
        "description": "Discord Administrator or configured UFB Administrator: create a read-only #ufb-help channel with six simple-language threads covering Start Here, Teams & Rosters, Free Agents, FC27 Matches & Images, Official League and Administrator Setup. Run it again after command changes to refresh the same channel and threads without duplicates. New installations request Manage Channels, View Channel, Send Messages, Embed Links, Read Message History, Create Public Threads, Manage Threads and Send Messages in Threads.",
        "examples": [
          "/setup helpcenter"
        ],
        "options": []
      },
      {
        "name": "/setup channel",
        "description": "Server owner/administrator: assign, inspect or clear a competition’s automatic free-agent channel. This is the same setting as /recruit channel.",
        "examples": [
          "/setup channel competition:6v6 channel:#free-agents-6v6"
        ],
        "options": [
          {
            "name": "competition",
            "description": "Choose an active league",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "channel",
            "description": "Discord channel for automatic free-agent posts",
            "type": 7,
            "channel_types": [
              0,
              5
            ]
          },
          {
            "name": "clear",
            "description": "Remove the competition channel assignment",
            "type": 5
          }
        ]
      },
      {
        "name": "/setup checkfeed",
        "description": "Server owner/administrator: validate the configured HTTPS match feed against a linked club, even when the team has not entered a league. Reports missing/disabled or invalid feeds; never enables a feed or fabricates statistics.",
        "examples": [
          "/setup checkfeed team:UFL Como — Unassigned"
        ],
        "options": [
          {
            "name": "team",
            "description": "Choose a linked team",
            "type": 3,
            "required": true,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/setup leaguesource",
        "description": "Server administrator: link a league in this Discord to a public UFL website season-data JSON URL. UFB checks standings, matchweeks and the three player-leader categories before saving. Omit url to inspect the current link; use clear:true to unlink. Other servers are unaffected.",
        "examples": [
          "/setup leaguesource league:UNC 6v6 — Season 1 url:https://www.uncfutbolleague.com/pickems-app/season-data.json",
          "/setup leaguesource league:UNC 6v6 — Season 1"
        ],
        "options": [
          {"name":"league","description":"League in this Discord server","type":3,"required":true,"autocomplete":true},
          {"name":"url","description":"Public UFL website season-data JSON URL","type":3},
          {"name":"clear","description":"Remove the linked website source","type":5}
        ]
      },
      {
        "name": "/setup create",
        "description": "Server owner/administrator: create an official 6v6 league, official 10v10 league, or custom 1v1–11v11 league. Custom leagues require team_size. League registration opens immediately.",
        "examples": [
          "/setup create type:Custom league name:UNC 3v3 team_size:3"
        ],
        "options": [
          {
            "name": "type",
            "description": "Competition type",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Official 6v6 league",
                "value": "league_6v6"
              },
              {
                "name": "Official 10v10 league",
                "value": "league_10v10"
              },
              {
                "name": "Custom league",
                "value": "league_custom"
              }
            ]
          },
          {
            "name": "name",
            "description": "Competition name, for example UNC 6v6 Season 2",
            "type": 3,
            "required": true,
            "max_length": 80
          },
          {
            "name": "team_size",
            "description": "Custom league only: players per side, such as 1 or 3",
            "type": 4,
            "min_value": 1,
            "max_value": 11
          },
        ]
      },
      {
        "name": "/setup competitions",
        "description": "Server owner/administrator: privately list every configured league, its registration status and whether a website source is linked.",
        "examples": [
          "/setup competitions"
        ],
        "options": []
      },
      {
        "name": "/setup removeleague",
        "description": "Server owner/administrator: remove a league from active setup after explicit confirmation. Active teams become unassigned while keeping managers, rosters, EA links and history. The old league is archived for historical references, and its original key becomes available for a fresh league.",
        "examples": [
          "/setup removeleague league:test-6v6 confirm:true"
        ],
        "options": [
          {
            "name": "league",
            "description": "League to remove from active setup",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "confirm",
            "description": "Confirm league removal and team unassignment",
            "type": 5,
            "required": true
          }
        ]
      },
      {
        "name": "/setup registration",
        "description": "Server owner/administrator: open or close team registration without deleting teams or settings. Opening can optionally set a 1–365 day deadline, reminders every one, two or three days, and a Discord channel. At the deadline UFB closes registration automatically.",
        "examples": [
          "/setup registration league:unc-6v6-season-2 state:Closed",
          "/setup registration league:unc-6v6-season-2 state:Open",
          "/setup registration league:unc-6v6-season-2 state:Open closes_in_days:14 reminder_every_days:2 channel:#league-registration"
        ],
        "options": [
          {
            "name": "league",
            "description": "Choose the registered competition before selecting a team",
            "type": 3,
            "required": true,
            "autocomplete": true
          },
          {
            "name": "state",
            "description": "Registration state",
            "type": 3,
            "required": true,
            "choices": [
              {
                "name": "Open",
                "value": "open"
              },
              {
                "name": "Closed",
                "value": "closed"
              }
            ]
          },
          {
            "name": "closes_in_days",
            "description": "Optional automatic closing deadline, 1–365 days from now",
            "type": 4,
            "min_value": 1,
            "max_value": 365
          },
          {
            "name": "reminder_every_days",
            "description": "Reminder frequency before closing; defaults to daily",
            "type": 4,
            "choices": [
              {
                "name": "Daily",
                "value": 1
              },
              {
                "name": "Every 2 days",
                "value": 2
              },
              {
                "name": "Every 3 days",
                "value": 3
              }
            ]
          },
          {
            "name": "channel",
            "description": "Channel for reminders and the closing notice; defaults to the current channel",
            "type": 7,
            "channel_types": [
              0,
              5
            ]
          }
        ]
      },
      {
        "name": "/setup team",
        "description": "Server owner/administrator: create a house or test team managed by you without placing your Discord account on its player roster. The league is optional, so EA clubs can be linked and tested before competition assignment.",
        "examples": [
          "/setup team name:FC Sandy Bums",
          "/setup team league:house-teams name:FC Sandy Bums"
        ],
        "options": [
          {
            "name": "name",
            "description": "Team name",
            "type": 3,
            "required": true,
            "max_length": 80
          },
          {
            "name": "league",
            "description": "Optional league; assign one later with /team assign",
            "type": 3,
            "autocomplete": true
          }
        ]
      },
      {
        "name": "/setup health",
        "description": "Server owner/administrator: run a private readiness check covering EA club links, live FC27 feeds, pending match watchers, failed stat deliveries and free-agent publishing channels.",
        "examples": [
          "/setup health"
        ],
        "options": []
      }
    ]
  },
  {
    "title": "Upcoming features",
    "description": "These are roadmap items, not working commands.",
    "commands": [
      {
        "name": "Session recaps & team-themed backgrounds",
        "status": "Planned",
        "description": "Overall session-summary images and linked-club/team-themed backgrounds remain future additions. Current per-match images, automatic club crests and the six muted backgrounds are already available in live testing under Matches & player statistics.",
        "examples": []
      },
      {
        "name": "Guided competition builders & announcements",
        "status": "Planned",
        "description": "Guided creation forms, public join/withdraw announcements and result hub messages. Private navigation panels and administrator-configured server defaults are already available.",
        "examples": []
      },
      {
        "name": "Draft match results & statistics",
        "status": "Planned",
        "description": "Record draft matches and connect squad results to individual player statistics.",
        "examples": []
      }
    ]
  }
];
