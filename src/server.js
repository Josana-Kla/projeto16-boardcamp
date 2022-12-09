import express from 'express';
import connection from './database/database.js';

const app = express();
app.use(express.json());

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