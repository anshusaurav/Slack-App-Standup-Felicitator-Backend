const { WebClient } = require("@slack/web-api");
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const getChannelsUsingCursor = async (token, channels, cursor) => {
    channels = channels || [];
    let payload = {};
    if (cursor)
        payload.cursor = cursor;
    payload.token = token;
    let res = await web.conversations.list(payload);
    channels = channels.concat(res.channels);
    if (res.response_metadata && res.response_metadata.next_cursor && res.response_metadata.next_cursor.length) {
        return getChannelsUsingCursor(channels, res.response_metadata.next_cursor);
    }
    return channels;

}

const getAllMembersUsingCursor = async (token, channel, members, cursor) => {
    members = members || [];
    let payload = {};
    if (cursor)
        payload.cursor = cursor;
    payload.token = token;
    payload.channel = channel
    let res = await web.conversations.members(payload)
    members = members.concat(res.members);
    if (res.response_metadata && res.response_metadata.next_cursor && res.response_metadata.next_cursor.length) {
        return getAllMembersUsingCursor(token, channel, members, res.response_metadata.next_cursor);
    }
    return members;
}


module.exports = { getChannelsUsingCursor, getAllMembersUsingCursor };