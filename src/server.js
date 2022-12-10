import express from 'express';
import connection from './database/database.js';
import joi from 'joi';

const app = express();
app.use(express.json());

const gamesSchema = joi.object({
    name: joi.string().pattern(/^[A-zÀ-ú]/).required().empty(''),
    image: joi.string().uri().required().empty(''),
    stockTotal: joi.number().integer().greater(0).required(),
    categoryId: joi.number().integer().required(),
    pricePerDay: joi.number().integer().greater(0).required()
}); 

//FUNCTIONS:
async function checkCategoryExists(name) {
    try {
        const categoryExists = await connection.query(`
            SELECT * FROM categories WHERE name=$1;
        `, [name]);

        if(categoryExists.rows[0].name === undefined) {
            console.log("A categoria não existe! Crie-a!");
            return false;
        } else {
            console.log("Essa categoria já existe!");
            return true;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se a categoria existe!");
    }
};

async function checkGameExists(name) {
    try {
        const gameExists = await connection.query(`
            SELECT * FROM games WHERE name=$1;
        `, [name]);

        if(gameExists.rows[0].name === undefined) {
            console.log("O jogo não existe! Crie-o!");
            return false;
        } else {
            console.log("Esse jogo já existe!");
            return true;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o jogo existe!");
    }
};

async function checkIdCategoryExists(id) {
    try {
        const sameId = await connection.query(`
            SELECT * FROM categories WHERE id = $1;
        `, [id]);

        if(sameId.rows[0].id === undefined) {
            console.log("O id não existe! Escolha um id existente ou crie uma nova categoria!");
            return true;
        } else {
            console.log("Esse id existe! 😃");
            return false;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o id da categoria existe!");
    }
};

// CATEGORIES ROUTES:
app.get("/categories", async (req, res) => {
    try {
        const categories = await connection.query(`
            SELECT * FROM categories;
        `);

        return res.status(200).send(categories.rows);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.post("/categories", async (req, res) => {
    const { name } = req.body;

    if(!name) {
        return res.sendStatus(400);
    };
    
    if(await checkCategoryExists(name)) {
        return res.sendStatus(409);
    };

    try {
        await connection.query(`
            INSERT INTO categories(name) VALUES($1)
        `, [name]);

        return res.sendStatus(201);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

// GAMES ROUTES:
app.get("/games", async (req, res) => {
    const { name } = req.query;

    try {
        let games;

        if(name) {
           /*  games = await connection.query(`
                SELECT * FROM games WHERE name LIKE '$1%';
            `, [name]); */

            return res.status(200).send(games.rows);
        } else {
            games = await connection.query(`
                SELECT * FROM games;
            `);

            return res.status(200).send(games.rows);
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.post("/games", async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
    const validation = gamesSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        return res.status(400).send(error);
    };

    if(await checkIdCategoryExists(categoryId)) {
        return res.sendStatus(400);
    };

    if(await checkGameExists(name)) {
        return res.sendStatus(409);
    };

    try {
        await connection.query(`
            INSERT INTO games(name, image, "stockTotal", "categoryId", "pricePerDay") VALUES($1, $2, $3, $4, $5)
        `, [name, image, stockTotal, categoryId, pricePerDay]);

        return res.sendStatus(201);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.listen(4000, () => console.log("Executando..."));