const { createServer } = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const CronJob = require("cron").CronJob;
const { createMessageAdapter } = require("@slack/interactive-messages");
const { createEventAdapter } = require("@slack/events-api");
const { WebClient } = require("@slack/web-api");

const {
    blocks,
    startMessage,
    standupCreateBlock,
    standupNotifyBlock,
    channelNotifyBlock,
    standupInitBlock
} = require("./slack/slackBlocks");
const { executeOperation, timeStamp } = require("./graphql/helpers");
const {
    HASURA_INSERT_STANDUP_OPERATION,
    HASURA_INSERT_CRONJOB_OPERATION,
    HASURA_DELETE_STANDUP_OPERATION,
    HASURA_DELETE_CRONJOB_OPERATION,
    HASURA_FETCH_CRONJOB_OPERATION,
    HASURA_UPDATE_STANDUP_OPERATION,
    HASURA_INSERT_STANDUPRUN_OPERATION,
    HASURA_DELETE_STANDUPRUN_OPERATION,
    HASURA_DISBLE_PASTRUNS_OPERATION,
    HASURA_PAUSE_STANDUP_OPERATION,
    HASURA_UNPAUSE_STANDUP_OPERATION,
    HASURA_INSERT_QUESTION_OPERATION,
    HASURA_INSERT_RESPONSE_OPERATION
} = require("./graphql/queries");
const { openModal, submitModal } = require("./slack/slackActions");
const { getAllMembersUsingCursor } = require("./slack/slackHelpers");

const crons = {};
const PORT = process.env.PORT || 3000;
// C01B8HWFN49 bot-test false 7
// C01C1690AU8 bot-test2 false 1
//UTWLKG02K
const app = express();
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const slackInteractions = createMessageAdapter(
    process.env.SLACK_SIGNING_SECRET
);
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

app.use("/slack/events", slackEvents.expressMiddleware());
app.use("/slack/actions", slackInteractions.expressMiddleware());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

slackInteractions.action({ actionId: "open_modal_button" }, openModal);

slackInteractions.viewSubmission("answer_modal_submit", submitModal);

slackEvents.on("message", async event => {
    //When any message is sent, check if its a bot msg or a user msg

    // console.log('Msg received in channel')
    // console.log(event.channel, event);
    const { channel } = event;
    if (event.bot_id) {
        console.log("Bot msg");
        return;
    }

    console.log("User msg");
    //Fetch last 2 messages
    let res1 = await web.conversations.history({ channel, limit: 2 });
    console.log("Getting last two messages", res1.messages);
    if (res1.messages.length < 2) {
        console.log("I think you have no standups");
        return;
    }
    const botMsg = res1.messages[1];
    // console.log('Bot msg', botMsg)
    //slackuser_id, standup_id, standup_run_id, slack_timestamp_id, question_id
    const slackuser_id = event.user;
    const slack_timestamp_id = botMsg.ts;
});
slackEvents.on("app_mention", async event => {
    console.log("menioned");

    web.chat
        .postMessage({
            blocks: startMessage(),
            channel: event.channel,
            text: ":wave: Hello"
        })
        .then((res, err) => {
            if (err) {
                console.log("error: ", err);
            }
        });
});
// Request Handler
app.post("/insertStandup", async (req, res) => {
    const {
        creator_slack_id,
        name,
        cron_text,
        channel,
        message,
        questions
    } = req.body.input;
    console.log(questions);
    let res1 = await executeOperation(
        {
            creator_slack_id,
            name,
            cron_text,
            channel,
            message
        },
        HASURA_INSERT_STANDUP_OPERATION
    );

    if (res1.errors) {
        return res.status(400).json(res1.errors[0]);
    }
    let questionRequests = questions.map((question, index) => {
        return executeOperation(
            {
                standup_id: res1.data.insert_standup_one.id,
                body: question,
                index
            },
            HASURA_INSERT_QUESTION_OPERATION
        );
    });

    let questionRes = await Promise.all(questionRequests);
    // questionRes.map( r => console.log(r.errors));

    if (questionRes.errors) {
        return res.status(400).json(questionRes.errors[0]);
    }
    // console.log(questionRes);
    let questionIDs = questionRes.map(q => q.data.insert_question_one.id);
    // console.log(questionIDs);
    let res2 = await executeOperation(
        {
            standup_id: res1.data.insert_standup_one.id
        },
        HASURA_INSERT_CRONJOB_OPERATION
    );

    if (res2.errors) {
        return res.status(400).json(res2.errors[0]);
    }
    console.log("Cronjob added with id:" + res2.data.insert_cronjob_one.id);
    // scheduling cron job as per cron provided
    crons[res2.data.insert_cronjob_one.id] = new CronJob(
        cron_text,
        async () => {
            const stamp = timeStamp();
            console.log(
                `Time: ${stamp} Standup :{name: ${name}, channel: ${channel},  message: ${message}`
            );
            let res3 = await executeOperation(
                { standup_id: res1.data.insert_standup_one.id },
                HASURA_INSERT_STANDUPRUN_OPERATION
            );
            if (res3.errors) {
                return res.status(400).json(res3.errors[0]);
            }

            let members = await getAllMembersUsingCursor(channel);
            let requests1 = members.map(member =>
                web.users.info({ user: member }).then(userRes => {
                    // console.log(userRes);
                    return web.chat.postMessage({
                        blocks: standupInitBlock({
                            name,
                            message,
                            username: userRes.user.real_name,
                            question: questions[0]
                        }),
                        channel: member
                    });
                })
            );

            let results1 = await Promise.all(requests1);
            let requests2 = results1.map((result, index) => {
                return executeOperation(
                    {
                        slackuser_id: members[index],
                        slack_timestamp_id: result.ts + '',
                        standup_id: res1.data.insert_standup_one.id,
                        standup_run_id: res3.data.insert_standup_run_one.id,
                        question_id: questionIDs[0]
                    },
                    HASURA_INSERT_RESPONSE_OPERATION
                )
            })
            let results2 = await Promise.all(requests2);
            results2.forEach(result => console.log(result.data.id || 'error'));
            // console.log(results2);
        },
        null,
        true,
        "Asia/Kolkata"
    );
    //send notification to creator of standup
    web.users.info({ user: creator_slack_id }).then(creatorRes => {
        web.conversations.info({ channel }).then(channelRes => {
            web.chat.postMessage({
                blocks: standupCreateBlock({
                    creator_slack_id: creatorRes.user.real_name,
                    name,
                    cron_text,
                    channel: channelRes.channel.name
                }),
                channel: creator_slack_id
            });
        });
    });

    //send notification in im to all channel members
    web.conversations.members({ channel }).then(response => {
        let requests = response.members.map(member =>
            web.users.info({ user: member }).then(userRes => {
                web.conversations.info({ channel }).then(channelRes => {
                    web.users.info({ user: creator_slack_id }).then(creatorRes => {
                        if (creator_slack_id !== member)
                            web.chat.postMessage({
                                blocks: standupNotifyBlock({
                                    name,
                                    username: userRes.user.name,
                                    creator_slack_id: creatorRes.user.name,
                                    cron_text,
                                    channel: channelRes.channel.name
                                }),
                                channel: member
                            });
                    });
                });
            })
        );

        //send channel message informing about standup
        web.conversations.info({ channel }).then(channelRes => {
            web.users.info({ user: creator_slack_id }).then(creatorRes => {
                web.chat.postMessage({
                    blocks: channelNotifyBlock({
                        name,
                        creator_slack_id: creatorRes.user.name,
                        cron_text,
                        channel: channelRes.channel.name
                    }),
                    channel
                });
            });
        });

        Promise.all(requests).then(res => res.forEach(resp => console.log("ya")));
    });
    return res.json({
        ...res1.data.insert_standup_one
    });
});

// Request Handler
app.post("/deleteStandup", async (req, res) => {
    const { standup_id } = req.body.input;

    const res4 = await executeOperation(
        { standup_id },
        HASURA_DELETE_STANDUPRUN_OPERATION
    );
    if (res4.errors) {
        return res.status(400).json(res4.errors[0]);
    }
    const res3 = await executeOperation(
        { standup_id },
        HASURA_FETCH_CRONJOB_OPERATION
    );

    if (res3.errors) {
        return res.status(400).json(res3.errors[0]);
    }

    if (res3.data.cronjob.length > 0) {
        crons[res3.data.cronjob[0].id].stop();
        console.log("Cronjob removed with id:" + res3.data.cronjob[0].id);
    }
    const res2 = await executeOperation(
        { standup_id },
        HASURA_DELETE_CRONJOB_OPERATION
    );

    if (res2.errors) {
        return res.status(400).json(res2.errors[0]);
    }

    const res1 = await executeOperation(
        { standup_id },
        HASURA_DELETE_STANDUP_OPERATION
    );

    if (res1.errors) {
        return res.status(400).json(res1.errors[0]);
    }
    // success
    return res.json({
        ...res1.data.delete_standup
    });
});

// Request Handler
app.post("/updateStandup", async (req, res) => {
    const { standup_id, channel, cron_text, message, name } = req.body.input;

    const res3 = await executeOperation(
        { standup_id, channel, cron_text, message, name },
        HASURA_UPDATE_STANDUP_OPERATION
    );
    if (res3.errors) {
        return res.status(400).json(res3.errors[0]);
    }

    const res1 = await executeOperation(
        { standup_id },
        HASURA_FETCH_CRONJOB_OPERATION
    );
    if (res1.errors) {
        return res.status(400).json(res1.errors[0]);
    }

    // console.log(res1.data);
    if (res1.data.cronjob.length > 0) {
        crons[res1.data.cronjob[0].id].stop();
        console.log("Cronjob removed with id:" + res1.data.cronjob[0].id);
    }
    const res2 = await executeOperation(
        { standup_id },
        HASURA_DELETE_CRONJOB_OPERATION
    );

    if (res2.errors) {
        return res.status(400).json(res2.errors[0]);
    }

    let res4 = await executeOperation(
        { standup_id },
        HASURA_INSERT_CRONJOB_OPERATION
    );

    if (res4.errors) {
        return res.status(400).json(res4.errors[0]);
    }
    console.log("Cronjob added with id:" + res4.data.insert_cronjob_one.id);
    // success
    crons[res4.data.insert_cronjob_one.id] = new CronJob(
        cron_text,
        () => {
            const stamp = timeStamp();
            console.log(
                `Time: ${stamp} Standup :{name: ${name}, channel: ${channel},  message: ${message}`
            );
            executeOperation({ standup_id }, HASURA_DISBLE_PASTRUNS_OPERATION).then(
                disableRes => {
                    executeOperation(
                        { standup_id },
                        HASURA_INSERT_STANDUPRUN_OPERATION
                    ).then(insertRes => {
                        web.conversations.members({ channel }).then(response => {
                            let requests = response.members.map(member =>
                                web.chat.postMessage({
                                    blocks: blocks({
                                        name,
                                        message,
                                        member,
                                        standup: standup_id,
                                        standup_run: insertRes.data.insert_standup_run_one.id
                                    }),
                                    channel: member
                                })
                            );
                            console.log(requests);
                            Promise.all(requests).then(res =>
                                res.forEach(resp => console.log("Res ", resp))
                            );
                        });
                    });
                }
            );
        },
        null,
        true,
        "Asia/Kolkata"
    );

    return res.json({
        ...res3.data.update_standup_by_pk
    });
});

app.post("/pauseStandup", async (req, res) => {
    const { standup_id } = req.body.input;

    let res1 = await executeOperation(
        { standup_id },
        HASURA_PAUSE_STANDUP_OPERATION
    );
    if (res1.errors) {
        return res.status(400).json(res1.errors[0]);
    }
    const res2 = await executeOperation(
        { standup_id },
        HASURA_FETCH_CRONJOB_OPERATION
    );
    if (res2.errors) {
        return res.status(400).json(res2.errors[0]);
    }

    // console.log(res1.data);
    if (res2.data.cronjob.length > 0) {
        crons[res2.data.cronjob[0].id].stop();
        console.log("Cronjob paused with id:" + res2.data.cronjob[0].id);
    }

    return res.json({
        ...res1.data.update_standup_by_pk
    });
});

app.post("/unpauseStandup", async (req, res) => {
    const { standup_id } = req.body.input;

    let res1 = await executeOperation(
        { standup_id },
        HASURA_UNPAUSE_STANDUP_OPERATION
    );
    if (res1.errors) {
        return res.status(400).json(res1.errors[0]);
    }

    const res2 = await executeOperation(
        { standup_id },
        HASURA_FETCH_CRONJOB_OPERATION
    );
    if (res2.errors) {
        return res.status(400).json(res2.errors[0]);
    }

    // console.log(res1.data);
    if (res2.data.cronjob.length > 0) {
        crons[res2.data.cronjob[0].id].start();
        console.log("Cronjob unpaused with id:" + res2.data.cronjob[0].id);
    }
    return res.json({
        ...res1.data.update_standup_by_pk
    });
});
app.listen(PORT, function () {
    console.log("Server is listening on port " + PORT);
});
