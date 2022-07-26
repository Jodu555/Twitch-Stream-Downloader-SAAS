# Twitch-Stream-Downloader-SAAS

Twitch Stream Downloader Software as a Service (SAAS) Records an currently active live stream

## Socket breakdown

- If a user is logged in
  The socket sends to them the data update every x seconds | 4s - 5s
  Only The Image update gets processed every x minute | 1s - 3s
