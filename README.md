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

## Paymodel

- Selfhosted
- Free
- Premium

### Selfhosted

Selfhosted is the cheapest way to use the Stream Recorder.
You can install the Stream Recorder on your own server and use it without any limitations.
Of course you then have to be responsible for the server and the bandwidth.

### Free

- You get 2 Simultaneous Stream Recording's (after 2 Streams are recorded you have to delete or download at least one, before you can record another)
- Maximum Recording Time is 8 hours
- The Check for new Streams is done every 30 minutes
- The Recorded Stream will be deleted after 2 days
- You can preview the first and last 10 minutes of the recorded stream after it is finished
- You get the best possible Stream quality

### Premium

- You get 5 Simultaneous Stream Recordings's
- Unlimited Recording Time
- The Check for new Streams is done every minute
- The Recorded Stream will be deleted after 7 days
- You can preview the entire stream after it is finished
- You get the best possible Stream quality
