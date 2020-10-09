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
  standupInitBlock,
  standupSubsequentBlocks,
  standupEndBlocks,
  notifyResponseBlocks
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
  HASURA_INSERT_RESPONSE_OPERATION,
  HASURA_FIND_BOTRESPONSE_OPERATION,
  HASURA_UPDATE_RESPONSE_OPERATION,
  HASURA_FETCH_NEXTQUESTION_OPERATION,
  HASURA_FETCH_ACTIVEQUESTIONS_OPERATION,
  HASURA_FETCH_QUESTION_OPERATION,
  HASURA_UPDATE_QUESTIONWITHHIGHERINDEX_OPERATION,
  HASURA_ARCHIVE_QUESTION_OPERATION,
  HASURA_FIND_RESPONSE_OPERATION,
  HASURA_FETCH_STANDUP_OPERATION,
  FETCH_WORKSPACE
} = require("./graphql/queries");
const { getAllMembersUsingCursor } = require("./slack/slackHelpers");

const crons = {};
const PORT = process.env.PORT || 3000;
// C01B8HWFN49 bot-test false 7
// C01C1690AU8 bot-test2 false 1
//UTWLKG02K
const app = express();
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

let web = new WebClient(process.env.SLACK_BOT_TOKEN);

app.use("/slack/events", slackEvents.expressMiddleware());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

slackEvents.on("message", async event => {
  //When any message is sent on user-bot channel, check if its a bot msg or a user msg
  console.log(event)
  const { channel } = event;
  const body = event.text;
  if (event.bot_id) {
    console.log("Bot msg");
    return;
  }
  console.log("User msg");
  console.log(event);
  const { team } = event;
  const checkUserRes = await executeOperation({ slack_id: team }, FETCH_WORKSPACE);
  if (!checkUserRes.data.workspace_by_pk)
    return;
  console.log(checkUserRes);
  const { token } = checkUserRes.data.workspace_by_pk;

  const webClient = new WebClient(token);
  //Fetch last 2 messages
  let res1 = await webClient.conversations.history({ channel, limit: 2 });
  if (res1.errors || res1.messages.length < 2) {
    return;
  }
  console.log('HERE');
  const botMsg = res1.messages[1];
  if (!res1.messages[1].bot_id) {
    return;
  }

  const slackuser_id = event.user;
  const slack_timestamp_id = botMsg.ts;
  //find response with slack user id and timestamp we get from history (2nd last msg)
  let res2 = await executeOperation(
    {
      slackuser_id,
      slack_timestamp_id
    },
    HASURA_FIND_BOTRESPONSE_OPERATION
  );

  if (res2.errors || res2.data.response.length === 0) {
    console.log("No matching response found");
    return;
  }

  let res3 = await executeOperation(
    {
      slackuser_id,
      standup_id: res2.data.response[0].standup_id,
      standup_run_id: res2.data.response[0].standup_run_id,
      question_id: res2.data.response[0].question.id,
      body
    },
    HASURA_UPDATE_RESPONSE_OPERATION
  );
  // console.log(res3);
  if (res3.errors) {
    console.log("Cant update response");
    return;
  }
  const index = res2.data.response[0].question.index + 1;
  let res4 = await executeOperation(
    {
      standup_id: res2.data.response[0].standup_id,
      index
    },
    HASURA_FETCH_NEXTQUESTION_OPERATION
  );
  if (res4.errors) {
    console.log("Cant fetch next question");
    return;
  }
  console.log('HERE2', slackuser_id);
  if (!res4.data.question.length) {
    let endRes = await webClient.chat.postMessage({
      blocks: standupEndBlocks({}),
      channel: slackuser_id
    });

    //Fetch all questions
    let questionsRes = await executeOperation(
      {
        standup_id: res2.data.response[0].standup_id
      },
      HASURA_FETCH_ACTIVEQUESTIONS_OPERATION
    );
    console.log('4');
    const questions = questionsRes.data.question.map(singleQ => singleQ.body);

    const responseRequests = questionsRes.data.question.map(singleQ => {

      return executeOperation(
        {
          slackuser_id,
          standup_id: res2.data.response[0].standup_id,
          standup_run_id: res2.data.response[0].standup_run_id,
          question_id: singleQ.id
        },
        HASURA_FIND_RESPONSE_OPERATION
      );
    });
    let responsesRes = await Promise.all(responseRequests);

    const answers = responsesRes.map(obj => obj.data.response[0].body);
    console.log(answers);

    let standupRes = await executeOperation({
      standup_id: res2.data.response[0].standup_id
    }, HASURA_FETCH_STANDUP_OPERATION);
    const standup_name = standupRes.data.standup[0].name;
    const creator_slack_id = standupRes.data.standup[0].creator_slack_id;

    let userRes = await webClient.users.info({ user: slackuser_id });
    const user_name = userRes.user.real_name;
    let notifyRes = await webClient.chat.postMessage({
      blocks: notifyResponseBlocks({
        questions,
        answers,
        user_name,
        standup_name
      }),
      channel: creator_slack_id
    });

    if (notifyRes.errors) {
      return;
    }
    //Fetch all responses

    // make two array of questions and answer

    //get user name get standupname and questions and answer pass in context to get this block and sent it to channel: creator

    console.log("Send thank you message");
    return;
  }
  console.log('3');
  let res5 = await webClient.chat.postMessage({
    blocks: standupSubsequentBlocks({
      question: res4.data.question[0].body
    }),
    channel: slackuser_id
  });
  if (res5.errors) {
    console.log("Cant send next question");
    return;
  }
  let res6 = await executeOperation(
    {
      slackuser_id,
      slack_timestamp_id: res5.ts,
      standup_id: res2.data.response[0].standup_id,
      standup_run_id: res2.data.response[0].standup_run_id,
      question_id: res4.data.question[0].id
    },
    HASURA_INSERT_RESPONSE_OPERATION
  );

  if (res6.errors) {
    console.log("Cant save response");
  }
  return;
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

// slackEvents.on("app_home_opened", async event => {
//   const userId = event.user;

//   try {
//     // Call the views.publish method using the built-in WebClient
//     const result = await web.views.publish({
//       user_id: userId,
//       view: homeBlock({userId})
//     });

//     console.log(result);
//   }
//   catch (error) {
//     console.error(error);

// }
// });

// Request Handlers
app.post("/insertStandup", async (req, res) => {
  const {
    creator_slack_id,
    name,
    cron_text,
    channel,
    message,
    questions,
    timezone,
    token
  } = req.body.input;
  let res1 = await executeOperation(
    {
      creator_slack_id,
      name,
      cron_text,
      channel,
      message,
      timezone,
      token
    },
    HASURA_INSERT_STANDUP_OPERATION
  );
  const webClient = new WebClient(token);
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
  if (questionRes.errors) {
    return res.status(400).json(questionRes.errors[0]);
  }
  let questionIDs = questionRes.map(q => q.data.insert_question_one.id);

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

  crons[res2.data.insert_cronjob_one.id] = new CronJob(
    cron_text,
    async () => {
      let res3 = await executeOperation(
        { standup_id: res1.data.insert_standup_one.id },
        HASURA_INSERT_STANDUPRUN_OPERATION
      );
      if (res3.errors) {
        return res.status(400).json(res3.errors[0]);
      }
      let members = await getAllMembersUsingCursor(token, channel);
      let requests1 = members.map(member =>
        webClient.users.info({ user: member }).then(userRes => {
          return webClient.chat.postMessage({
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
      console.log(results1);
      let requests2 = results1.map((result, index) => {
        return executeOperation(
          {
            slackuser_id: members[index],
            slack_timestamp_id: result.ts,
            standup_id: res1.data.insert_standup_one.id,
            standup_run_id: res3.data.insert_standup_run_one.id,
            question_id: questionIDs[0]
          },
          HASURA_INSERT_RESPONSE_OPERATION
        );
      });
      let results2 = await Promise.all(requests2);
      results2.forEach(result => console.log("Standup msg sent"));
    },
    null,
    true,
    timezone
  );
  // send notification to creator of standup
  webClient.users.info({ user: creator_slack_id }).then(creatorRes => {
    webClient.conversations.info({ channel }).then(channelRes => {
      webClient.chat.postMessage({
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
  webClient.conversations.members({ channel }).then(response => {
    let requests = response.members.map(member =>
      webClient.users.info({ user: member }).then(userRes => {
        webClient.conversations.info({ channel }).then(channelRes => {
          webClient.users.info({ user: creator_slack_id }).then(creatorRes => {
            if (creator_slack_id !== member)
              webClient.chat.postMessage({
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
    webClient.conversations.info({ channel }).then(channelRes => {
      webClient.users.info({ user: creator_slack_id }).then(creatorRes => {
        webClient.chat.postMessage({
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
  if (res3.data.cronjob.length) {
    if (crons[res3.data.cronjob[0].id]) crons[res3.data.cronjob[0].id].stop();
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
  return res.json({
    ...res1.data.update_standup
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
              // console.log(requests);
              Promise.all(requests).then(res =>
                res.forEach(resp => console.log("Res "))
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
  console.log('HERE');
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

  console.log('PPP', res1.data);
  if (res2.data.cronjob.length > 0) {
    if (crons[res2.data.cronjob[0].id]) {
      crons[res2.data.cronjob[0].id].stop();
      console.log("Cronjob paused with id:" + res2.data.cronjob[0].id);
    }
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
    if (crons[res2.data.cronjob[0].id]) {
      crons[res2.data.cronjob[0].id].start();
      console.log("Cronjob unpaused with id:" + res2.data.cronjob[0].id);
    }
  }
  return res.json({
    ...res1.data.update_standup_by_pk
  });
});

app.post("/insertQuestion", async (req, res) => {
  const { standup_id, body } = req.body.input;
  let res1 = await executeOperation(
    { standup_id },
    HASURA_FETCH_ACTIVEQUESTIONS_OPERATION
  );
  if (res1.errors) {
    return res.status(400).json(res1.errors[0]);
  }
  let maxIndex = -1;
  res1.data.question.forEach(ques => {
    if (ques.index > maxIndex) maxIndex = ques.index;
  });
  let res2 = await executeOperation(
    {
      standup_id,
      body,
      index: maxIndex + 1
    },
    HASURA_INSERT_QUESTION_OPERATION
  );
  if (res2.errors) {
    return res.status(400).json(res2.errors[0]);
  }
  return res.json({ ...res2.data.insert_question_one });
});

app.post("/deleteQuestion", async (req, res) => {
  const { question_id } = req.body.input;

  let res1 = await executeOperation(
    {
      question_id
    },
    HASURA_FETCH_QUESTION_OPERATION
  );

  if (res1.errors) {
    return res.status(400).json(res1.errors[0]);
  }
  let index = res1.data.question[0].index;
  let standup_id = res1.data.question[0].standup_id;
  let res2 = await executeOperation(
    { standup_id, index },
    HASURA_UPDATE_QUESTIONWITHHIGHERINDEX_OPERATION
  );
  if (res2.errors) {
    return res.status(400).json(res2.errors[0]);
  }
  let res3 = await executeOperation(
    { question_id },
    HASURA_ARCHIVE_QUESTION_OPERATION
  );
  if (res3.errors) {
    return res.status(400).json(res3.errors[0]);
  }
  return res.json({ ...res3.data.update_question });
});
//Sunny's code(Suraj Kumar Choudhary)
// app.post("/getMembers", async (req, res) => {
//   const { channel } = req.body.input;
//   const members = await getAllMembersUsingCursor(channel);
//   const requests = members.map(async member => {
//     return await web.users.info({ user: member });
//   });

//   const results = await Promise.all(requests);
//   // console.log(results);
//   const { images, real_names, ids } = results.reduce(
//     (
//       final_result,
//       {
//         user: {
//           id,
//           real_name,
//           profile: { image_72 },
//           is_bot
//         }
//       }
//     ) => {
//       final_result["images"] = final_result["images"] || [];
//       final_result["real_names"] = final_result["real_names"] || [];
//       final_result["ids"] = final_result["ids"] || [];
//       if (!is_bot) {
//         final_result["ids"].push(id);
//         final_result["images"].push(image_72);
//         final_result["real_names"].push(real_name);
//       }
//       return final_result;
//     },
//     {}
//   );

//   return res.json({
//     ids,
//     real_names,
//     images
//   });
// });
app.listen(PORT, function () {
  console.log("Server is listening on port " + PORT);
});
