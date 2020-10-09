const {
  randomGreeting,
  trimTitle,
  getCronAsString
} = require("./../graphql/helpers");
const blocks = context => {
  return [
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${randomGreeting()}!! :wave: *${
          context.username
        }*! another standup time \n*${context.name}* \n ${context.message}`
      }
    },
    {
      type: "actions",
      block_id: `${context.standup}||${context.standup_run}`,
      elements: [
        {
          type: "button",
          action_id: "open_modal_button",
          text: {
            type: "plain_text",
            text: "Answer Questions",
            emoji: true
          },
          style: "primary",
          value: "click_me_123"
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Dismiss",
            emoji: true
          },
          value: "click_me_123"
        }
      ]
    },
    {
      type: "divider"
    }
  ];
};

const modalBlockPostAnswer = context => {
  return {
    type: "modal",
    callback_id: "answer_modal_submit",
    title: {
      type: "plain_text",
      text: `${trimTitle(context.name, 24)}`,
      emoji: true
    },
    submit: {
      type: "plain_text",
      text: "Submit",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `${context.message}`,
          emoji: true
        }
      },
      {
        type: "input",
        block_id: `${context.standup}||${context.standup_run}${
          context.response.length ? "||" + context.response : ""
        }`,
        element: {
          action_id: "answer_input_element",
          type: "plain_text_input",
          multiline: true,
          initial_value: `${context.response_body}`,
          placeholder: {
            type: "plain_text",
            text: "Please answer here"
          }
        },
        label: {
          type: "plain_text",
          text: "Answer here",
          emoji: true
        }
      }
    ]
  };
};

const modalBlockViewAnswer = context => {
  return {
    type: "modal",
    callback_id: "answer_modal_submit",
    title: {
      type: "plain_text",
      text: `${trimTitle(context.name, 24)}`,
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `${context.message}`,
          emoji: true
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Response Submitted"
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>${
            context.response_body.length
              ? context.response_body
              : "_No answer submitted_"
          }`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url:
              "https://api.slack.com/img/blocks/bkb_template_images/notificationsWarningIcon.png",
            alt_text: "notifications warning icon"
          },
          {
            type: "mrkdwn",
            text:
              "This standup run is complete, You can't change or post new answers"
          }
        ]
      }
    ]
  };
};

const standupCreateBlock = context => {
  return [
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${randomGreeting()}!!  ${
          context.creator_slack_id
        } :wave: I'm pupbot, Your standup *${
          context.name
        }* is now active, well done!
        \nI have informed all participants and will will send them a DM with the questions.\t`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${context.name}*\nTimeline: ${getCronAsString(
          context.cron_text
        )} \nChannel: ${context.channel}\n`
      },
      accessory: {
        type: "image",
        image_url:
          "https://api.slack.com/img/blocks/bkb_template_images/notifications.png",
        alt_text: "calendar thumbnail"
      }
    },
    {
      type: "divider"
    }
  ];
};

const standupNotifyBlock = context => {
  return [
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${randomGreeting()}!! ${context.username}:wave: I'm geekbot, @${
          context.creator_slack_id
        } has created the standup *${
          context.name
        }* in Slack and I am here to help get you started.
\nI will send you a DM at assigned time ${getCronAsString(context.cron_text)} \n`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${context.name}* \nTimeline: ${getCronAsString(
          context.cron_text
        )} \nChannel: ${context.channel}\n`
      },
      accessory: {
        type: "image",
        image_url:
          "https://api.slack.com/img/blocks/bkb_template_images/notifications.png",
        alt_text: "calendar thumbnail"
      }
    },
    {
      type: "divider"
    }
  ];
};

const channelNotifyBlock = context => {
  return [
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hi there :wave: I'm pupbot, and I will be facilitating *${
          context.name
        }* created by *@${context.creator_slack_id}* in Slack.
                \nI will send you a DM at assigned timeline ${getCronAsString(
                  context.cron_text
                )} \n`
      },
      accessory: {
        type: "image",
        image_url:
          "https://api.slack.com/img/blocks/bkb_template_images/notifications.png",
        alt_text: "calendar thumbnail"
      }
    },
    {
      type: "divider"
    }
  ];
};

const standupInitBlock = context => [
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Hello :wave: ${context.username}!! another standup time *${context.name}*\n ${context.message}\n\n${context.question}`
    }
  },
  {
    type: "divider"
  }
];
const standupSubsequentBlocks = context => [
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${context.question}`
    }
  },
  {
    type: "divider"
  }
];

const standupEndBlocks = () => [
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "Thank you for answering all questions"
    }
  },
  {
    type: "divider"
  }
];
const confuseBotBlocks = () => [
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        "I am not sure about what I should respond to that.\n\nBut I can still help you answer standup questions :sunglasses:."
    },
    accessory: {
      type: "image",
      image_url: "https://i.imgur.com/A3rBm5K.gif",
      alt_text: "alt text for image"
    }
  },
  {
    type: "divider"
  }
];
const startMessage = () => [
  {
    type: "section",
    text: { type: "mrkdwn", text: ":dog: Hello!!" }
  }
];

const notifyResponseBlocks = context => [
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Hi!! *${context.user_name}* submitted response for standup *${context.standup_name}*\n`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${context.questions.map(
        (question, index) =>
          ">*"+
          question +
          "*\n>" +
          (context.answers[index]
            ? context.answers[index]
            : "_No answer submitted_") +
          "\n"
      ).join("\n")}`
    }
  },
  {
    type: "divider"
  }
];

const homeBlock = context => {
  return {
    // Home tabs must be enabled in your app configuration page under "App Home"
    type: "home",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Welcome home, <@${context.userId}> :house:*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "Great to see you here! App helps you to post new and answer existing standups within Slack. These are just a few things which you will be able to do:"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "• Schedule standups \n • Manage standups \n • Answer standups you are part of"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "You can create a new standup or check existing ones on dashboard"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Add Standup :clock9:",
              emoji: true
            },
            style: "primary"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Go To Dashboard :rocket:",
              emoji: true
            }
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Pick the hour for the standup"
        },
        accessory: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select hour",
            emoji: true
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "10",
                emoji: false
              },
              value: "10"
            },
            {
              text: {
                type: "plain_text",
                text: "11",
                emoji: false
              },
              value: "11"
            },
            {
              text: {
                type: "plain_text",
                text: "12",
                emoji: false
              },
              value: "12"
            },
            {
              text: {
                type: "plain_text",
                text: "13",
                emoji: false
              },
              value: "13"
            },
            {
              text: {
                type: "plain_text",
                text: "14",
                emoji: false
              },
              value: "14"
            }
          ]
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Pick the minute for the standup"
        },
        accessory: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select minute",
            emoji: true
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "10",
                emoji: false
              },
              value: "10"
            },
            {
              text: {
                type: "plain_text",
                text: "11",
                emoji: false
              },
              value: "11"
            },
            {
              text: {
                type: "plain_text",
                text: "12",
                emoji: false
              },
              value: "12"
            },
            {
              text: {
                type: "plain_text",
                text: "13",
                emoji: false
              },
              value: "13"
            },
            {
              text: {
                type: "plain_text",
                text: "14",
                emoji: false
              },
              value: "14"
            }
          ]
        }
      },
      {
        type: "section",
        block_id: "section678",
        text: {
          type: "mrkdwn",
          text: "Pick days of the week"
        },
        accessory: {
          action_id: "text1234",
          type: "multi_static_select",
          placeholder: {
            type: "plain_text",
            text: "Select days"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Monday"
              },
              value: "1"
            },
            {
              text: {
                type: "plain_text",
                text: "Tuesday"
              },
              value: "2"
            },
            {
              text: {
                type: "plain_text",
                text: "Wednesday"
              },
              value: "3"
            },
            {
              text: {
                type: "plain_text",
                text: "Thursday"
              },
              value: "4"
            },
            {
              text: {
                type: "plain_text",
                text: "Friday"
              },
              value: "5"
            },
            {
              text: {
                type: "plain_text",
                text: "Saturday"
              },
              value: "6"
            },
            {
              text: {
                type: "plain_text",
                text: "Sunday"
              },
              value: "6"
            }
          ]
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        block_id: "section68",
        text: {
          type: "mrkdwn",
          text: "Pick a channel from the dropdown list"
        },
        accessory: {
          action_id: "text1234",
          type: "channels_select",
          placeholder: {
            type: "plain_text",
            text: "Select a channel"
          }
        }
      },

      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text:
              "Psssst this home tab was designed using <https://api.slack.com/tools/block-kit-builder|*Block Kit Builder*>"
          }
        ]
      }
    ]
  };
};
module.exports = {
  blocks,
  modalBlockPostAnswer,
  modalBlockViewAnswer,
  startMessage,
  standupCreateBlock,
  standupNotifyBlock,
  channelNotifyBlock,
  standupInitBlock,
  standupSubsequentBlocks,
  standupEndBlocks,
  confuseBotBlocks,
  homeBlock,
  notifyResponseBlocks
};
