const {searchByIngredients} = require('./search');

const result = searchByIngredients(["red vermouth", "campari"]);
        if (result.length > 0) {
            console.log(`Вы можете приготовить ${result[0].name}. ${result[0].desc}.`);
        } else {
            console.log(`Я не нашел коктейлей из этих ингридиентов`);
        }