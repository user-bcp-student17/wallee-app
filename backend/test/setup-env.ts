// Las pruebas e2e usan una base en memoria para no escribir en data/.
process.env.DB_PATH = ':memory:';
process.env.DB_SEED = 'true';
