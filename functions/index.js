'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {google} = require('googleapis');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const moment = require('moment');
const {searchByIngredients, getCoctail} = require('./search');


const calendarID = "r0t73fd5fnrmig4667sv8fakr0@group.calendar.google.com";

const serviceAccount = {
    "type": "service_account",
    "project_id": "myfirstagent-abjryf",
    "private_key_id": "1fbea93390d32c605bce66f8cfe6b0bbf1550a2d",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCNun4/oAtOfnyG\nxyKTEPQcErliZ1KsoNoecwfhrJ3/6eEznVw0ubkl7iC1EVOuZf5i/4icomZ+Z6qB\n2qwrpuOdt23vXXIw5TaXi6P4KKKIxf8LrA31mvFdr3mxrA9+3IpsWd7t5IxXfc2h\nIF1o6YCeup0G1WCpj+uVw5p+SpMBXixPnwV/qceZ97uxkwgx6U59fRPxFi955t52\nhfn6H7KgYX6fUKq83EklGUxuPpgedlQdxvNh+dUXJ5LmmT4NerNFgMXiMTlqWASH\nVvbSpnWcy1KM0eZJmFQ1GIUc6TA9mMvpWdk4GOGiL2+GQjLYs6L8+FXTTpCC6/f/\n1xci23wpAgMBAAECggEAEvMU7zfcWyXhS3nznvs80EYWoFgVPzyQfVK/Aob8Zxuj\nvy1yhyAv56jjmaIT8LT1YtIst1ilYJBGxW7x5zI8q7k7Sy5Q1sXG21NR3Ju+Q5BJ\njgt2oFiTngWYvU82kS02ms8XVfJha09IP5tesejKiC6GUUQVVQaHprINBYa+CggU\n47kUh10S8tJVkHGvfTdy403oP7hzUYGcDq0WIgoNRav12ZbA/p3wMBbtsfx+dUT4\npfTG0XLiHReRlugc5W8oF8WuYJEmGx3BW+gYYlNq8nB6IHJEXMCaUx61vt4JeHKh\nVpC2bsU6LS/e5KhMQADyAl9V6YEb+FsfMCLlm958awKBgQDG6Ilp43j5vXtHIqil\nB5OrKiiTt4VHpQHxpZIzoCd92wS9rctwoEbcDSf1o7pXxsocXhA5cGWPqcAwlBHa\n9+vYngwSZL9LkQFgIn5RmsDIy/l2ouV2z58KpMG+FARGCZGdmy3xqd8LtmckWQCs\nJqVWnpfMLv5zInRhYzk8zV4FGwKBgQC2aHkX89k1DZqFc4TSa6W6ng3xsZs3rbfu\ndWMP1tDyNjM1cD084FQxn+/icXZnpOQftOu+idvNpRkCKRwv1smEkrC4RisxjEWy\nrO/GhrYl8mtxR57YTP9n3kjf98QF5l7c0WBcX7XXi4QpNop3EjKzSQZxkrIH60vL\nC7/hs/wMCwKBgQCzf8nx+suDZFFJwqc6Nno2btcrZuQp4Wi9r1Mer5qz4uCGY75B\npwILNvwmmlhhOg3OR7yQeTPNz7yWmij619zIIOh3+N8AzJzXKomgDu2Gxzwaqao1\n6+t0aXZFmD67DYuRFScC/O9B3Jt7m64VrNJsNrZ6FradJCyubiKLEjGUnQKBgQCA\nANRpcJ+OUVuMJsKgfxYv3VZfs4j/C5M1bX700ISUVGCfMYJnw+yRXnEScRjsJpRH\ng8ijT07GAwOHtp2nHI0R0Xbd+a+593u5pQ4mPMZ53qJzPhVEKNRaaWyubspKcZ1E\nTFHYwPl0pt05pqKIaGbX1XkGHjF8ySvI8xfWJV3MfQKBgByEsMdEdHNsRThKMxsa\nV9484yZLrQPS9jwLCwtTz8FRLMWo+zio8+i+/9MS674y8oi3UUO4ohqpaA80kgCl\n/S0Ylin5rFLIpseeS7yTlpf6JoinSxn/Jm3AFqIoA9yB4TlE3Jg/UtvNV6KzjwuH\n3XjgmvPe8hyizrlX7EhoeABH\n-----END PRIVATE KEY-----\n",
    "client_email": "myagentcalendar@myfirstagent-abjryf.iam.gserviceaccount.com",
    "client_id": "112172703324190003494",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/myagentcalendar%40myfirstagent-abjryf.iam.gserviceaccount.com"
};


const serviceAccountAuth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: 'https://www.googleapis.com/auth/calendar'
});

const calendar = google.calendar('v3');

const timeZone = 'Russia/Moscow';  // Change it to your time zone
const timeZoneOffset = '+03:00';

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

function convertParametersDate(date, time) {
    return new Date(Date.parse(date.split('T')[0] + 'T' + time.split('T')[1].split('-')[0] + timeZoneOffset));
}

// A helper function that adds the integer value of 'hoursToAdd' to the Date instance 'dateObj' and returns a new Data instance.
function addHours(dateObj, hoursToAdd) {
    return new Date(new Date(dateObj).setHours(dateObj.getHours() + hoursToAdd));
}

// A helper function that converts the Date instance 'dateObj' into a string that represents this time in English.
function getLocaleTimeString(dateObj) {
    return dateObj.toLocaleTimeString('en-US', {hour: 'numeric', hour12: true, timeZone: timeZone});
}

// A helper function that converts the Date instance 'dateObj' into a string that represents this date in English.
function getLocaleDateString(dateObj) {
    return dateObj.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: timeZone});
}

function createCalendarEvent(dateTimeStart, dateTimeEnd) {
    return new Promise((resolve, reject) => {
        calendar.events.list({  // List all events in the specified time period
            auth: serviceAccountAuth,
            calendarId: calendarID,
            timeMin: dateTimeStart.toISOString(),
            timeMax: dateTimeEnd.toISOString()
        }, (err, calendarResponse) => {
            // Check if there exists any event on the calendar given the specified the time period
            if (err || calendarResponse.data.items.length > 0) {
                reject(err || new Error('Requested time conflicts with another appointment'));
            } else {
                // Create an event for the requested time period
                calendar.events.insert({
                        auth: serviceAccountAuth,
                        calendarId: calendarID,
                        resource: {
                            summary: 'Bike Appointment',
                            start: {dateTime: dateTimeStart},
                            end: {dateTime: dateTimeEnd}
                        }
                    }, (err, event) => {
                        err ? reject(err) : resolve(event);
                    }
                );
            }
        });
    });
}


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

    function ingredientsIntent(agent) {
        const ingredient = agent.parameters.ingredient || [];

        // if (agent.context.get('current') && agent.context.get('current').parameters.ingridient) {
        //     for (let i of agent.context.get('current').parameters.ingridient) {
        //         if (ingridient.indexOf(i) > -1) {
        //             continue
        //         }
        //         ingridient.push(i)
        //     }
        // }
        // let currentCoctail;

        // if (agent.context.get('current') && agent.context.get('current').parameters.ingridient) {
        //     currentCoctail = agent.context.get('current').parameters.ingridient;
        // }
        //
        // if (currentCoctail) {
        //
        // }

        const result = searchByIngredients(ingredient);
        if (result.length > 0) {
            agent.add(`Вы можете приготовить ${result[0].name}. ${result[0].desc}.`);
            agent.add(new Suggestion(`Показать рецепт`));
            agent.setContext({name: 'current', lifespan: 999, parameters: {coctail: result[0].key}});
        } else {
            agent.add(`Я не нашел коктейлей из этих ингридиентов`);
        }
    }

    function recipeIntent(agent) {

        try {
            let coctailName = agent.parameters.coctail || agent.getContext('current').parameters.coctail;
            agent.add(`Как приготовить ${coctailName} ...`);
            if (!coctailName) {
                agent.add(`Какой коктейль вас интересует?`);
                return
            }

            const coctail = getCoctail(coctailName);

            agent.add(new Card({
                    title: `Рецепт коктейля ${coctail.name}`,
                    imageUrl: coctail.imageUrl,
                    text: coctail.recipe,
                })
            );
            agent.setContext({name: 'current', lifespan: 2, parameters: {coctail: coctailName}});
        } catch (e) {
            console.log(e);
            agent.add(`${e}`);
            agent.add(`Когда я помнила рецепт этого коктейля, но сейчас он вылетел из моей головы`)
        }
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('recipe', recipeIntent);
    intentMap.set('ingredients', ingredientsIntent);
    intentMap.set('ingredients:recipe', recipeIntent);

    // intentMap.set('<INTENT_NAME_HERE>', googleAssistantHandler);
    agent.handleRequest(intentMap);
});
