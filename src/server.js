import express from 'express';
import connection from './database/database.js';

const app = express();

app.get("/categories", async (req, res) => {
    try {
        const categories = await connection.query(`
        SELECT * FROM categories;
        `);

        return res.status(200).send(categories.rows);
    } catch(error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

app.listen(4000);