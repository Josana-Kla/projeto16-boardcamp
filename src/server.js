import express from 'express';
import connection from './database/database.js';
import joi from 'joi';
import DateExtension from '@joi/date';
import dayjs from 'dayjs';

const app = express();
app.use(express.json());

const joii = joi.extend(DateExtension);

const gamesSchema = joi.object({
    name: joi.string().pattern(/^[A-zÀ-ú]/).required().empty(' '),
    image: joi.string().uri().required().empty(' '),
    stockTotal: joi.number().integer().greater(0).required(),
    categoryId: joi.number().integer().required(),
    pricePerDay: joi.number().integer().greater(0).required()
}); 

const customersSchema = joi.object({
    name: joi.string().pattern(/^[A-zÀ-ú]/).required().empty(' '),
    phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required().empty(' '),
    cpf: joi.string().pattern(/^[0-9]+$/).min(11).max(11).required().empty(' '),
    birthday: joii.date().utc().format('YYYY-MM-DD').required()
}); 

//FUNCTIONS:
function currentDate() {
    return dayjs(new Date()).format('YYYY-MM-DD');
};

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

async function checkCpfExists(cpf) {
    try {
        const cpfExists = await connection.query(`
            SELECT * FROM customers WHERE cpf = $1;
        `, [cpf]);

        if(cpfExists.rows[0].cpf === undefined) {
            console.log("O cpf não existe!");
            return false;
        } else {
            console.log("Esse cpf já existe!");
            return true;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o cpf existe!");
    }
};

async function checkCustomerIdExists(id) {
    try {
        const idExists = await connection.query(`
            SELECT * FROM customers WHERE id = $1;
        `, [id]);

        if(idExists.rows[0].id === undefined) {
            console.log("O id do cliente não existe!");
            return true;
        } else {
            console.log("Esse id de cliente já existe!");
            return false; 
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o id do cliente existe!");
    }
};

async function checkGameIdExists(id) {
    try {
        const gameIdExists = await connection.query(`
            SELECT * FROM games WHERE id=$1;
        `, [id]);

        if(gameIdExists.rows[0].id === undefined) {
            console.log("O id do jogo não existe!");
            return true;
        } else {
            console.log("Esse id de jogo já existe!");
            return false;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o id do jogo existe!");
    }
};

async function calculateTotalGamePriceForRentedDays(daysRented, gameId) {
    try {
        const gamePrice = await connection.query(`
            SELECT "pricePerDay" FROM games WHERE id = $1;
        `, [gameId]);

        if(gamePrice.rows[0]) {
            const calcTotal = daysRented * gamePrice;
            console.log(`O preço total do aluguel do jogo é: ${calcTotal}`);
            return calcTotal;
        };
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao calcular o preço total do aluguel do jogo!");
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
            games = await connection.query(`
                SELECT * FROM games WHERE name ILIKE($1 || '%');
            `, [name]);

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

// CLIENTES ROUTES:
app.get("/customers", async (req, res) => {
    const { cpf } = req.query;

    try {
        let customers;

        if(cpf) {
            customers = await connection.query(`
                SELECT * FROM customers WHERE cpf LIKE $1 || '%';
            `, [cpf]);

            return res.status(200).send(customers.rows);
        } else {
            customers = await connection.query(`
                SELECT * FROM customers;
            `);

            return res.status(200).send(customers.rows);
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.post("/customers", async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    const validation = customersSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        return res.status(400).send(error);
    };

    if(await checkCpfExists(cpf)) {
        return res.sendStatus(409);
    };

    try {
        await connection.query(`
            INSERT INTO customers(name, phone, cpf, birthday) VALUES($1, $2, $3, $4)
        `, [name, phone, cpf, birthday]);

        return res.sendStatus(201);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.get("/customers/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        const customerById = await connection.query(`
            SELECT * FROM customers WHERE id = $1;
        `, [id]);

        if(customerById.rows[0].id) {
            return res.status(200).send(customerById.rows[0]);
        };
    } catch (error) {
        console.log(error);
        return res.sendStatus(404);
    }
});

app.put("/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone, cpf, birthday } = req.body;
    const validation = customersSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        return res.status(400).send(error);
    };

    if(await checkCpfExists(cpf)) {
        return res.sendStatus(409);
    };

    try {
        await connection.query(`
            UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5;
        `, [name, phone, cpf, birthday, id]);

        return res.sendStatus(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

// RENTALS ROUTES:
app.get("/rentals", async (req, res) => {
    const { customerId } = req.query;
    const { gameId } = req.query;

    try {
        let clientRentals;

        if(customerId) {
            clientRentals = await connection.query(`
                SELECT * FROM rentals WHERE customerId = $1;
            `, [customerId]);

            return res.status(200).send(clientRentals.rows);
        } else if(gameId) {
            clientRentals = await connection.query(`
                SELECT * FROM rentals WHERE gameId = $1;
            `, [gameId]);

            return res.status(200).send(clientRentals.rows);
        } else {
            clientRentals = await connection.query(`
                SELECT * FROM rentals;
            `);

            return res.status(200).send(clientRentals.rows);
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.post("/rentals", async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const rentDate = currentDate();
    const returnDate = null;
    const delayFee = null;

    if(await checkCustomerIdExists(customerId)) {
        return res.sendStatus(400);
    };

    if(await checkGameIdExists(gameId)) {
        return res.sendStatus(400);
    };

    const originalPrice = calculateTotalGamePriceForRentedDays(daysRented, gameId); 

    try {
        await connection.query(`
            INSERT INTO rentals("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES($1, $2, $3, $4, $5, $6, $7)
        `, [
            customerId,
            gameId,
            rentDate,
            daysRented,
            returnDate,     // data que o cliente devolveu o jogo (null enquanto não devolvido)
            originalPrice,  // preço total do aluguel em centavos (dias alugados vezes o preço por dia do jogo)
            delayFee  // multa total paga por atraso (dias que passaram do prazo vezes o preço por dia do jogo)
        ]);

        return res.sendStatus(201);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.listen(4000, () => console.log("Executando..."));