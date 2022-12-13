import express from 'express';
import connection from './database/database.js';
import cors from 'cors';
import joi from 'joi';
import DateExtension from '@joi/date';
import dayjs from 'dayjs';
import categoryRouter from './routers/categories.routers.js';
import gameRouter from './routers/games.routers.js';

const app = express();
app.use(cors());
app.use(express.json());

const joii = joi.extend(DateExtension);

// Routes:
app.use(categoryRouter);
app.use(gameRouter);


const customersSchema = joi.object({
    name: joi.string().pattern(/^[A-zÀ-ú]/).required().empty(' '),
    phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required().empty(' '),
    cpf: joi.string().pattern(/^[0-9]+$/).min(11).max(11).required().empty(' '),
    birthday: joii.date().utc().format('YYYY-MM-DD').required()
}); 

const rentalsSchema = joi.object({
    customerId: joi.number().integer().required(),
    gameId: joi.number().integer().required(),
    daysRented: joi.number().integer().greater(0).required()
}); 

//FUNCTIONS:
function currentDate() {
    return dayjs(new Date()).format('YYYY-MM-DD');
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
        console.log("Erro no servidor ao verificar se o id do cliente existe! Ou ele não existe!");
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
        console.log("Erro no servidor ao verificar se o id do jogo existe! Ou ele não existe!");
    }
};

async function calculateTotalGamePriceForRentedDays(daysRented, gameId) {
    try {
        const gamePrice = await connection.query(`
            SELECT "pricePerDay" FROM games WHERE id = $1;
        `, [gameId]);

        const gamePriceValue = gamePrice.rows[0].pricePerDay;

        if(gamePriceValue) {
            const calcTotal = daysRented * gamePriceValue;
            console.log(`O preço total do aluguel do jogo é: ${daysRented} dias de aluguel x ${gamePriceValue} preço do jogo = ${calcTotal}`);
            return calcTotal;
        };
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao calcular o preço total do aluguel do jogo!");
    }
};

async function checkAvailableGames(daysRented, gameId) {
    try {
        const game = await connection.query(`
            SELECT "stockTotal" FROM games WHERE id = $1;
        `, [gameId]);

        const gameStockValue = game.rows[0].stockTotal;

        if(daysRented === undefined || daysRented <= gameStockValue) {
            console.log(`O jogo está disponível para locação! Temos ${gameStockValue} jogos em estoque e você acabou de alugar um 😃`);
            return true;
        } else {
            console.log("O jogo não está disponível para locação!");
            return false;
        };
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o jogo está disponível para locação!");
    }
};

async function checkRentalIdExists(id) {
    try {
        const rentalIdExists = await connection.query(`
            SELECT * FROM rentals WHERE id=$1;
        `, [id]);

        if(rentalIdExists.rows[0].id === undefined) {
            console.log("O id do aluguel não existe!");
            return true;
        } else {
            console.log("Esse id de aluguel já existe!");
            return false;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o id do aluguel existe! Ou ele não existe!");
    }
};

async function calculateAmountFineForLateReturnedGame(id, delayFee) {
    try {
        const rentalsById = await connection.query(`
            SELECT "gameId", "rentDate", "daysRented", "returnDate" FROM rentals WHERE id = $1;
        `, [id]);

        const rentDate = rentalsById.rows[0].rentDate;
        const daysRented = rentalsById.rows[0].daysRented;
        const returnDate = rentalsById.rows[0].returnDate;
        const gameId = rentalsById.rows[0].gameId;

        const gamePricePerDay = await connection.query(`
            SELECT "pricePerDay" FROM games WHERE id = $1;
        `, [gameId]);
        
        const pricePerDay = gamePricePerDay.rows[0].pricePerDay;

        const subtractionDates = Math.abs(returnDate.getTime() - rentDate.getTime());
        const daysDifferenceBetweenReturnAndRentDay = Math.ceil(subtractionDates / (1000 * 60 * 60 * 24)); 
        delayFee = (daysDifferenceBetweenReturnAndRentDay - daysRented) * pricePerDay;

        if(daysRented < daysDifferenceBetweenReturnAndRentDay) {
            console.log(`Tem multa no valor de ${delayFee}`);
            return delayFee;
        };
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao calcular o valor da multa!");
    }
};

async function checkMovieNotReturned(id) {
    try {
        const movieNotReturned = await connection.query(`
            SELECT "returnDate" FROM rentals WHERE id=$1;
        `, [id]);

        const movieNotReturnedValue = movieNotReturned.rows[0].returnDate;

        if(movieNotReturnedValue !== undefined || movieNotReturnedValue !== null) {
            console.log("Esse filme não foi devolvido!");
            return true;
        } else {
            console.log("O filme foi devolvido!");
            return false;
        }
    } catch (error) {
        console.log(error);
        console.log("Erro no servidor ao verificar se o filme foi devolvido!");
    }
};


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
                SELECT 
                rentals.*, 
                JSON_BUILD_OBJECT('id', customers.id, 'name', customers.name) AS customer, 
                JSON_BUILD_OBJECT('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', games."name") AS game FROM rentals
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId"=categories.id
                WHERE rentals."customerId" = $1;
            `, [customerId]);

            return res.status(200).send(clientRentals.rows);
        } else if(gameId) {
            clientRentals = await connection.query(`
                SELECT 
                rentals.*, 
                JSON_BUILD_OBJECT('id', customers.id, 'name', customers.name) AS customer, 
                JSON_BUILD_OBJECT('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', games."name") AS game FROM rentals
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId"=categories.id
                WHERE rentals."gameId" = $1;
            `, [gameId]);

            return res.status(200).send(clientRentals.rows);
        } else {
            clientRentals = await connection.query(`
                SELECT 
                rentals.*, 
                JSON_BUILD_OBJECT('id', customers.id, 'name', customers.name) AS customer, 
                JSON_BUILD_OBJECT('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', games."name") AS game FROM rentals
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId"=categories.id;
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
    const validation = rentalsSchema.validate(req.body, {abortEarly: false});
    const rentDate = currentDate();
    const returnDate = null;
    const delayFee = null;

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        return res.status(400).send(error);
    };

    if(await checkCustomerIdExists(customerId)) {
        return res.sendStatus(400);
    };

    if(await checkGameIdExists(gameId)) {
        return res.sendStatus(400);
    };

    const originalPrice = await calculateTotalGamePriceForRentedDays(daysRented, gameId); 
    const availableGames = await checkAvailableGames(daysRented, gameId);

    try {
        if(availableGames){
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
        } else {
            return res.sendStatus(400);
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.put("/rentals/:id/return", async (req, res) => {
    const { id } = req.params;
    const returnDate = currentDate();
    let delayFee = null;

    if(await checkRentalIdExists(id)) {
        return res.sendStatus(404);
    };

    if(await !checkMovieNotReturned(id)) {
        return res.sendStatus(404);
    };

    try {
        await connection.query(`
            UPDATE rentals SET "returnDate" = $1 WHERE id = $2
        `, [returnDate, id]); 

        const fineExists = await calculateAmountFineForLateReturnedGame(id, delayFee);
        console.log(fineExists);

        if(fineExists !== undefined) {
            await connection.query(`
                UPDATE rentals SET "delayFee" = $1 WHERE id = $2;
            `, [fineExists, id]);

            return res.sendStatus(200);
        }; 

        return res.sendStatus(200);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.delete("/rentals/:id", async (req, res) => {
    const { id } = req.params;

    if(await checkRentalIdExists(id)) {
        return res.sendStatus(404);
    };

    const movieNotReturned = await checkMovieNotReturned(id);

    try {
        if(movieNotReturned) {
            return res.sendStatus(400);
        } else {
            await connection.query(`
                DELETE FROM rentals WHERE id = $1;
            `, [id]);

            return res.sendStatus(200);
        } 
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.listen(4000, () => console.log("Executando..."));