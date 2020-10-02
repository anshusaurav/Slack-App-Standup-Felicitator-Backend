const fetch = require("node-fetch");

const executeOperation = async (variables, operation) => {
  const headers = {
    "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET
  };
  const fetchResponse = await fetch(
    "https://hopeful-squirrel-40.hasura.app/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: operation,
        variables
      }),
      headers
    }
  );
  const data = await fetchResponse.json();
  return data;
};

const timeStamp = () => {
  var date = new Date();
  var seconds = ("0" + date.getSeconds()).slice(-2);
  var minutes = ("0" + date.getMinutes()).slice(-2);
  var hour = ("0" + date.getHours()).slice(-2);
  return `${hour}:${minutes}:${seconds}`;
};

const randomGreeting = () => {
  const greetings = [
    "Bonjour",
    "Salut",
    "Al Salaam aliykhum",
    "Namaste",
    "What's up",
    "Hello",
    "Hey",
    "Hola",
    "Hi",
    "Ahoy",
    "Salaam",
    "Namaskar",
    "Shalom"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};


const getCronAsString = (string) =>{
  const tokens = string.split(' ');
  const min = tokens[0];
  const hour = tokens[1];
  const dayTokens = tokens[4].split(',').map(elem=>+elem);
  dayTokens.sort((a,b)=>a-b);
  const week = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  let resDays = week.filter((day, index) => dayTokens.includes(index));//dayTokens.map(day=> week[day]);//week.filter((day, index) => dayTokens.includes(index));
  let dayStr = "";
  
  if(resDays.length === 1)
    dayStr = resDays[0];
  else if(resDays.length ===2 )
    dayStr = resDays[0]+" and "+resDays[1]
  else if(resDays.length === 7){
    dayStr = "All days"
  }
  else{
    for(let i = 0; i < resDays.length-2; i++){
      dayStr += resDays[i]+", ";
    }
    dayStr += resDays[resDays.length-2]+ " and "+ resDays[resDays.length-1];
    // console.log('a', dayStr);
  }
  return ('0' + hour).slice(-2) + ':' + ('0' + min).slice(-2) + " on "+ dayStr;
}
module.exports = { executeOperation, timeStamp, randomGreeting,getCronAsString };
