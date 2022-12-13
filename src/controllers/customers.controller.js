import connection from '../database/database.js';
import joi from 'joi';
import DateExtension from '@joi/date';

const joii = joi.extend(DateExtension);

const customersSchema = joi.object({
    name: joi.string().pattern(/^[A-zÀ-ú]/).required().empty(' '),
    phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required().empty(' '),
    cpf: joi.string().pattern(/^[0-9]+$/).min(11).max(11).required().empty(' '),
    birthday: joii.date().utc().format('YYYY-MM-DD').required()
}); 

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

async function getCustomers(req, res) {
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
};

async function createCustomers(req, res) {
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
};

async function getCustomersById(req, res) {
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
};

async function updateCustomers(req, res) {
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
};

export { getCustomers, createCustomers, getCustomersById, updateCustomers }; 