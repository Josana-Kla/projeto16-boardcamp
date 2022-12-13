import express from 'express';
import cors from 'cors';

import categoryRouter from './routers/categories.routers.js';
import gameRouter from './routers/games.routers.js';
import customerRouter from './routers/customers.routers.js';
import rentalRouter from './routers/rentals.routers.js';

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES:
app.use(categoryRouter);
app.use(gameRouter);
app.use(customerRouter);
app.use(rentalRouter);

app.listen(4000, () => console.log("Executando..."));