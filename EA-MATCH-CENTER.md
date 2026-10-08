# EA Match Center handoff

The protected website route is `/admin?tab=ea-matches`. It is restricted to authenticated website users whose role is `owner` or `admin`.

The Discord channel reserved for this connection is `1520080337806299181`.

## Cloudflare connection to add when UFB is ready

Bind the website Pages/Worker project to the deployed UFB Worker with a service binding named `UFB_BOT`. Optionally set the non-secret variable `UFB_EA_CHANNEL_ID`; when omitted, the website uses the reserved channel above.

No relay credential or EA endpoint is exposed to the browser. The website calls the UFB Worker over the private service binding, following Cloudflare's Worker-to-Worker service-binding pattern.

## Internal UFB contract

The UFB Worker should accept these private service-binding requests:

- `GET https://ufb.internal/admin/linked-clubs?channelId=1520080337806299181`
- `GET https://ufb.internal/admin/linked-clubs/:clubId/matches?channelId=1520080337806299181`

The website also sends the channel ID in the `x-ufl-channel-id` header. UFB must restrict results to clubs linked in that Discord channel/guild context and must reject arbitrary EA club IDs.

Club-list response:

```json
{
  "clubs": [
    {
      "id": "bot-team-id",
      "name": "UFL club name",
      "league": "Season 2 6v6",
      "eaClubId": "ea-club-id",
      "eaClubName": "EA club name",
      "platform": "common-gen5"
    }
  ]
}
```

Recent-matches response:

```json
{
  "club": { "id": "bot-team-id", "name": "UFL club name" },
  "matches": [
    {
      "id": "ea-match-id",
      "playedAt": 1790000000000,
      "type": "leagueMatch",
      "clubs": [
        {
          "id": "ea-club-id",
          "name": "Club A",
          "score": 2,
          "players": [
            { "id": "player-id", "name": "Player", "human": true, "motm": false, "stats": ["CAM", "8.2", "1", "1"] }
          ]
        },
        { "id": "opponent-id", "name": "Club B", "score": 1, "players": [] }
      ]
    }
  ]
}
```

Until `UFB_BOT` exists, the admin panel intentionally displays an awaiting-bot state and makes no external EA requests.
