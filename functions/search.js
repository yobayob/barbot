const data = require('./data/ru.json');

function searchByIngredients(ingredients) {
    const result = [];

    for (let key of Object.keys(data.coctails)) {
        const percent = 1.0/data.coctails[key].ingredients.length;
        let cost = 0;
        for (let i of data.coctails[key].ingredients) {
            for (let ii of ingredients) {
                if (typeof i !== 'string') {
                    for (let iii of i) {
                        if (iii === ii) {
                            cost += percent;
                            break
                        }
                    }
                }
                if (ii === i) {
                    cost += percent;
                    break
                }
            }
        }

        //check cost
        if (cost === 0) {
            continue
        }

        let res = Object.assign({
            cost: cost,
            key: key,
        }, data.coctails[key]);

        result.push(res);
    }
    result.sort(function (a, b) {
        return a.cost - b.cost
    });
    result.reverse();
    return result;
}

function getCoctail(name) {
    return data.coctails[name]
}


function getIngredientString(name) {
    const coctail = getCoctail(name);
    const ingredient = [];
    for (let i of coctail.ingredients) {
        if (typeof i === 'string') {
            if (!data.ingredients[i]) {
                continue
            }
            ingredient.push(data.ingredients[i].name);
        } else {
            const alt = [];
            for (let ii of i) {
                if (!data.ingredients[ii]) {
                    continue
                }
                alt.push(data.ingredients[ii].name);
            }
            ingredient.push(alt.join(" или "))
        }
    }
    return ingredient.join(", ");
}

module.exports = {
    searchByIngredients,
    getCoctail,
    getIngredientString,
};