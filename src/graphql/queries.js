const HASURA_FETCH_STANDUP_OPERATION = `query getStandup($standup_id: uuid!){
      standup(where: {id: {_eq: $standup_id}}){
        id
        name
        message
        cron_text
        channel
        creator_slack_id
        timezone
        paused
        archived
        created_at
        updated_at
      }
    }
    `;

const HASURA_INSERT_STANDUP_OPERATION = `
  mutation insertStandup($creator_slack_id:String!, $name: String!, $cron_text: String!, $channel: String!, $message: String!, $timezone: String! ) {
    insert_standup_one(
      object: {
        creator_slack_id: $creator_slack_id
        name: $name
        cron_text: $cron_text
        channel:$channel
        message: $message
        timezone: $timezone
      }) {
      id
      name
      message
      cron_text
      channel
      creator_slack_id
      timezone
      paused
      archived
      created_at
      updated_at
    }
  }
  `;

const HASURA_INSERT_CRONJOB_OPERATION = `
  mutation insertCronjob($standup_id: uuid!){
    insert_cronjob_one(object: {standup_id:$standup_id}){
      id,
      standup_id,
      created_at,
      updated_at
    }
  }
  `;

const HASURA_DELETE_STANDUP_OPERATION = ` 
  mutation deleteStandup($standup_id: uuid!) { 
    update_standup(where: {id: {_eq: $standup_id}}, _set: {archived: true}){
      affected_rows
    }
  }
  `;

const HASURA_DELETE_CRONJOB_OPERATION = `  
  mutation deleteCronjob($standup_id: uuid!){ 
    delete_cronjob(where: {standup_id: {_eq: $standup_id}}){
      affected_rows
    }
  }
  `;

const HASURA_FETCH_CRONJOB_OPERATION = `
  query getCronJob($standup_id: uuid!){
  cronjob(where: {standup_id: {_eq: $standup_id}}) {
      id
      standup_id,
      created_at,
      updated_at
    }
  }
  `;

const HASURA_UPDATE_STANDUP_OPERATION = `
  mutation updateStandup($standup_id:uuid!, $channel: String!, $cron_text: String!, $message: String!, $name: String!  ) {
    update_standup_by_pk(pk_columns: {id: $standup_id}, _set: {channel: $channel, cron_text: $cron_text, message: $message, name: $name}) {
      id
      creator_slack_id
      channel
      cron_text
      message
      name
      paused
      updated_at
      created_at
    }
  }
  `;

const HASURA_INSERT_STANDUPRUN_OPERATION = `
  mutation insertSandupRun($standup_id: uuid!) {
    insert_standup_run_one(object: {standup_id: $standup_id}){
      id
      standup_id
      created_at
    }
  }
  `;

const HASURA_DELETE_STANDUPRUN_OPERATION = `
  mutation deleteStandupRun($standup_id: uuid!) {
    delete_standup_run(where: {standup_id: {_eq: $standup_id}}){
      affected_rows
    }
  }
  `;

const HASURA_INSERT_RESPONSE_OPERATION = `
  mutation insertResponse($standup_id: uuid!, $standup_run_id: uuid!, $slackuser_id: String!, $body: String, $slack_timestamp_id: String!, $question_id: uuid!) {
  insert_response_one(object: {standup_id: $standup_id, standup_run_id: $standup_run_id, slackuser_id: $slackuser_id, slack_timestamp_id: $slack_timestamp_id, question_id: $question_id, body: $body}) {
    id
    standup_id
    standup_run_id
    slackuser_id
    slack_timestamp_id
    question_id
    body
    created_at
    updated_at
  }
}
  `;

const HASURA_FIND_RESPONSE_OPERATION = `
query findResponseByUserStandup($standup_id: uuid!, $standup_run_id: uuid!, $slackuser_id: String!, $question_id: uuid) {
  response(where: {slackuser_id: {_eq: $slackuser_id}, standup_id: {_eq: $standup_id}, standup_run_id: {_eq: $standup_run_id}, question_id: {_eq: $question_id}}){
    id
    standup_id
    standup_run_id
    slackuser_id
    body
    question_id
    created_at
    updated_at
  }
}`;

const HASURA_FIND_BOTRESPONSE_OPERATION = `
query findResponseSmart($slackuser_id: String!, $slack_timestamp_id: String!) {
  response(where: {slack_timestamp_id: {_eq: $slack_timestamp_id}, slackuser_id: {_eq: $slackuser_id}}) {
    id
    standup_id
    standup_run_id
    slackuser_id
    slack_timestamp_id
    body
    question{
      id
      body
      index
    }
    created_at
    updated_at
  }
}
`;

const HASURA_UPDATE_RESPONSE_OPERATION = `
mutation updateResponseByUser($standup_id: uuid!, $standup_run_id: uuid!, $question_id: uuid!, $slackuser_id: String!, $body: String!) {
  update_response(where: {standup_id: {_eq: $standup_id}, slackuser_id: {_eq: $slackuser_id}, standup_run_id: {_eq: $standup_run_id}, question_id: {_eq: $question_id}}, _set: {body: $body}){
    returning{
      id
      standup_id
      standup_run_id
      slackuser_id
      question{
        id
        body
        index
      }
      slack_timestamp_id
      body
      created_at
      updated_at
    }
  }
}`;

const HASURA_DISBLE_PASTRUNS_OPERATION = `
mutation disablePastRuns($standup_id: uuid!) {
  update_standup_run(where: {standup_id: {_eq: $standup_id}}, _set: {active: false}){
    affected_rows
  }
}
`;
const HASURA_FIND_RUN_OPERATION = `
query getStandUpRun($standup_run_id: uuid!) {
  standup_run_by_pk(id: $standup_run_id){
    id
    standup_id
    active
    created_at
    updated_at
  }
}
`;
const HASURA_PAUSE_STANDUP_OPERATION = `
mutation pauseStandup($standup_id: uuid!) { 
    update_standup_by_pk(pk_columns: {id: $standup_id}, _set: {paused: true}){
    id
    creator_slack_id
    cron_text
    channel
    name
    message
    paused
    created_at
    updated_at
  }
}
`;

const HASURA_UNPAUSE_STANDUP_OPERATION = `
mutation pauseStandup($standup_id: uuid!) { 
    update_standup_by_pk(pk_columns: {id: $standup_id}, _set: {paused: false}){
    id
    creator_slack_id
    cron_text
    channel
    name
    message
    paused
    created_at
    updated_at
  }
}
`;

const HASURA_INSERT_QUESTION_OPERATION = `
mutation insertQuestion($body: String!, $standup_id:uuid!,$index: Int) {
  insert_question_one(object: {body: $body, standup_id: $standup_id, index: $index}){
    id
    standup_id
    archived
    body
    index
    created_at
    updated_at
  }
}
`;

const HASURA_FETCH_NEXTQUESTION_OPERATION = `
query findNextQuestion($standup_id: uuid!, $index: Int!) {
  question(where: {standup_id: {_eq: $standup_id}, index: {_eq: $index}}){
    id
    standup_id
    body
    index
    archived
  }
}`;

const HASURA_FETCH_ACTIVEQUESTIONS_OPERATION = `
query findActiveQuestions($standup_id: uuid!) {
  question(where: {archived: {_eq: false}, standup_id: {_eq: $standup_id}}){
    id
    standup_id
    body
    index
    archived
    created_at
    updated_at
  }
}`;

const HASURA_FETCH_QUESTION_OPERATION = `
query getQuestion($question_id: uuid!) {
  question(where: {id: {_eq: $question_id}, archived: {_eq: false}}){
    id
    standup_id
    body
    index
    archived
    created_at
    updated_at
    
  }
}
`;

const HASURA_UPDATE_QUESTIONWITHHIGHERINDEX_OPERATION = `
  mutation updateQuestionsWithHigherIndex($index: Int!, $standup_id: uuid!) {
  update_question(where: {standup_id: {_eq: $standup_id}, archived: {_eq: false}, index: {_gt: $index}}, _inc: {index: -1}) {
    affected_rows
  }
}
`;
const HASURA_ARCHIVE_QUESTION_OPERATION = `
mutation archiveQuestion($question_id: uuid!) {
  update_question(where: {id: {_eq: $question_id}}, _set: {archived: true}) {
    affected_rows
  }
}`;
module.exports = {
  HASURA_FETCH_STANDUP_OPERATION,
  HASURA_INSERT_STANDUP_OPERATION,
  HASURA_INSERT_CRONJOB_OPERATION,
  HASURA_DELETE_STANDUP_OPERATION,
  HASURA_DELETE_CRONJOB_OPERATION,
  HASURA_FETCH_CRONJOB_OPERATION,
  HASURA_UPDATE_STANDUP_OPERATION,
  HASURA_INSERT_STANDUPRUN_OPERATION,
  HASURA_DELETE_STANDUPRUN_OPERATION,
  HASURA_INSERT_RESPONSE_OPERATION,
  HASURA_FIND_RESPONSE_OPERATION,
  HASURA_UPDATE_RESPONSE_OPERATION,
  HASURA_DISBLE_PASTRUNS_OPERATION,
  HASURA_FIND_RUN_OPERATION,
  HASURA_PAUSE_STANDUP_OPERATION,
  HASURA_UNPAUSE_STANDUP_OPERATION,
  HASURA_INSERT_QUESTION_OPERATION,
  HASURA_FIND_BOTRESPONSE_OPERATION,
  HASURA_FETCH_NEXTQUESTION_OPERATION,
  HASURA_FETCH_ACTIVEQUESTIONS_OPERATION,
  HASURA_FETCH_QUESTION_OPERATION,
  HASURA_UPDATE_QUESTIONWITHHIGHERINDEX_OPERATION,
  HASURA_ARCHIVE_QUESTION_OPERATION
};
