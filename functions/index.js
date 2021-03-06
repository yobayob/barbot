'use strict';

const functions = require('firebase-functions');
const {WebhookClient, Card, Suggestion, Payload} = require('dialogflow-fulfillment');
const {searchByIngredients, getCoctail, getIngredientString} = require('./search');
const { Carousel } = require('actions-on-google');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

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

    function getIngredient(agent) {
        const ingredient = agent.parameters.ingredient || [];
        const ctxIngredient = agent.getContext('current').parameters.ingredient;

        if (ctxIngredient && ctxIngredient.length > 0) {
            for (let i of ctxIngredient) {
                if (ingredient.indexOf(i) > -1) {
                    continue
                }
                ingredient.push(i);
            }
        }
        return ingredient
    }

    function ingredientsIntent(agent) {

        const ingredient = getIngredient(agent);

        const result = searchByIngredients(ingredient);
        if (result.length > 0) {
            agent.add(`Вы можете приготовить ${result[0].name}. ${result[0].desc}.`);
            agent.add(new Suggestion(`Показать рецепт`));
            agent.add(new Suggestion(`Показать все`));

            agent.setContext({name: 'current', lifespan: 9999, parameters: {
                coctail: result[0].key,
                ingredient: ingredient,
            }});
            return;
        }

        agent.add(`Я не нашел коктейлей из этих ингридиентов`);
        agent.setContext({name: 'current', lifespan: 9999, parameters: {
            coctail: null,
            ingredient: ingredient,
        }});
    }

    function recipeIntent(agent) {

        try {
            // actions_intent_option - if use carousel
            let coctailName = agent.parameters.coctail || agent.getContext('current').parameters.coctail || agent.getContext('actions_intent_option').parameters.OPTION;
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
            agent.add(new Suggestion(`Состав`));
            agent.setContext({name: 'current', lifespan: 9999, parameters: {
                coctail: coctailName,
                ingredient: [],
            }});
            console.log(`recipe:context: `, agent.getContext('current'))
        } catch (e) {
            console.log(e);
            agent.add(`${e}`);
            agent.add(`Когда я помнил рецепт этого коктейля, но сейчас он вылетел из моей головы`)
        }
    }

    function coctailListByIngredient(agent) {
        try {
            const ingredient = getIngredient(agent);
            const result = searchByIngredients(ingredient);

            const items = [];
            for (let item of result) {
                if (items.length >= 10) {
                    break
                }
                items.push({
                    title: item.name,
                    description: item.desc,
                    optionInfo: {
                        key: item.key
                    },
                    image: {
                        url: item.imageUrl,
                        accessibilityText: item.name,
                    },
                });
            }

            const payload = new Payload(agent.ACTIONS_ON_GOOGLE,   {
                    "expectUserResponse": true,
                    "richResponse": {
                      "items": [
                        {
                          "simpleResponse": {
                            "textToSpeech": "Все коктейли"
                          }
                        }
                      ]
                    },
                    "systemIntent": {
                      "intent": "actions.intent.OPTION",
                      "data": {
                        "@type": "type.googleapis.com/google.actions.v2.OptionValueSpec",
                        "carouselSelect": {
                          "items": items,
                        }
                      }
                    }
                  });
            agent.add(payload);
            agent.setContext({name: 'current', lifespan: 9999, parameters: {
                coctail: null,
                ingredient: ingredient,
            }});

        } catch (e) {
            console.log(e);
            agent.add(`${e}`);
            agent.add(`Кажется я потерял свою барную карту`)
        }
    }

    function ingredientListForCocktail(agent){
        console.log(`recipe:ingredients:context: `, agent.getContext('current'))
        let coctailName = agent.parameters.coctail || agent.getContext('current').parameters.coctail;
        try {
            const ingredient = getIngredientString(coctailName);
            agent.add(`Состав коктейля ${coctailName.original || coctailName}`);
            agent.add(ingredient)
        } catch (e) {
            agent.add(`${e}`);
            agent.add(`Кажется, я забыл состав данного коктейля`)
        }

        agent.setContext({name: 'current', lifespan: 9999, parameters: {
            coctail: coctailName,
            ingredient: [],
        }});
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('ingredients', ingredientsIntent);
    intentMap.set('ingredients:recipe', recipeIntent);
    intentMap.set('recipe', recipeIntent);
    intentMap.set('recipe:ingredient', ingredientListForCocktail);
    intentMap.set('coctail-list-by-ingredient', coctailListByIngredient);
    intentMap.set('coctail-list-by-ingredient:recipe', recipeIntent);
    // intentMap.set('<INTENT_NAME_HERE>', googleAssistantHandler);
    agent.handleRequest(intentMap);
});
