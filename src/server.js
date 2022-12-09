import express from 'express';
import connection from './database/database.js';

const app = express();
app.use(express.json());

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
        console.log("Erro no servidor!");
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

app.listen(4000);