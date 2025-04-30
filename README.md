# Twitch-Stream-Downloader-SAAS

Twitch Stream Downloader Software as a Service (SAAS) Records an currently active live stream

## Socket breakdown

-   If a user is logged in
    The socket sends to them the data update every x seconds | 5s
    Only The Image update gets processed every x minute | 25s

## Video States

-   0 = In Recording
-   1 = Recording Finished (Nothing running)
-   2 = In Rendering
-   3 = Rendering Finished (Whole video process finished)

## Paymodel

-   Selfhosted
-   Free
-   Premium

### Selfhosted

Selfhosted is the cheapest way to use the Stream Recorder.
You can install the Stream Recorder on your own server and use it without any limitations.
Of course you then have to be responsible for the server and the bandwidth.

### Free

-   You get 2 Simultaneous Stream Recording's (after 2 Streams are recorded you have to delete or download at least one, before you can record another)
-   Maximum Recording Time is 8 hours
-   The Check for new Streams is done every 30 minutes
-   The Recorded Stream will be deleted after 2 days
-   You can preview the first and last 10 minutes of the recorded stream after it is finished
-   You get the best possible Stream quality

### Premium

-   You get 5 Simultaneous Stream Recordings's
-   Unlimited Recording Time
-   The Check for new Streams is done every minute
-   The Recorded Stream will be deleted after 7 days
-   You can preview the entire stream after it is finished
-   You get the best possible Stream quality

## Cronjob once a day

-   Set old videos to be deleted and next day delete them
-   If a user is status verification pending, and the account was created 2 days ago
    -   Delete the account
-   Check every user for their subscription status:
    -   If only 7 days left create new invoice and email them and mark them as
    -   At the day it is due send them an email that their invoice is due and in 7 days their account will be reset
    -   If it is expired send them an email that in 7 days their account will be reset

### Account Reset Meaning

All Videos that overflow with the free tier slots will be marked as deleted
All Monitors that overflow with the free tier slots will be deleted

Here goes the rule of first come first server:
This means the first sniffentry you deleted will persist
Aswell as the first videos recorded that are not deleted

### Signup Flow

1.  Enter Email and password
    1.5 Account created and marked as pending
2.  Get send a email code to verify
3.  Enter the code in the input field
4.  Account is verified created

## ToDo for MVP

-   [x] Rename all Sniff Entry / Streamer Slots etc. to Automations
-   [x] Link the RecordEntry / Videos with the automations together (if they are linked)
-   [x] Move the /streamers routes all to recordings and get them into their own router file as well as the record route to a post route
-   [x] Move all the restrictions to the server side
-   [x] Implement the restrictions on all the endpoints
-   [ ] Let the client pull those restrictions and act on it
-   [ ] Get the account notification settings working in the db
    -   [ ] Work on sending those notifications
-   [ ] Dynamically show the Unlock More button and if shown get them working
-   [ ] Better handle the pricing page since thechnically there is no Downgrade, is you just dont pay you downgrade to free and can then upgrade to some other plan
-   [ ] Describe the subscription process in the explanations
-   [ ] Actually create an invoice when a user tries to upgrade to a paid plan
-   [ ] Implement the cron endpoints and get them hooked up
