// const { Pool } = require('pg');
// require('dotenv').config();

// const pool = new Pool
// ({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// module.exports = 
// {
//   pool,
//   query: (text, params) => pool.query(text, params),
//   connect: () => pool.connect(),
// };

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Загружаем переменные из .env в корне бэкенда

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("FATAL ERROR: DATABASE_URL is not set in the environment variables. Please check your .env file.");
    process.exit(1); // Выходим, если строка подключения не найдена
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Попробуй сначала БЕЗ этой строки. Если будут ошибки SSL, тогда добавь.
                                 // Для Neon это часто нужно.
    }
});

pool.on('connect', () => {
    console.log('🐘 Successfully connected to PostgreSQL database via connection string (Neon.tech)');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client or during pool connection', err);
    // process.exit(-1); // В режиме разработки можно не завершать процесс, а просто логировать
});

// Экспортируем объект, чтобы в моделях можно было делать `const { pool } = require(...)` или `const db = require(...)`
// Если твои модели используют `const db = require(...)` и ожидают сам пул, то:
// module.exports = pool; 

// Если твои модели используют `const { pool } = require(...)`:
module.exports = { pool }; 

// Или если ты хочешь иметь удобный метод query:
// module.exports = {
//     pool,
//     query: (text, params) => pool.query(text, params),
// };