# Twitch-Stream-Downloader-SAAS

Twitch Stream Downloader Software as a Service (SAAS) Records an currently active live stream

## Socket breakdown

- If a user is logged in
  The socket sends to them the data update every x seconds | 5s
  Only The Image update gets processed every x minute | 25s

## Video States

- 0 = In Recording
- 1 = Recording Finished (Nothing running)
- 2 = In Rendering
- 3 = Rendering Finished (Whole video process finished)
