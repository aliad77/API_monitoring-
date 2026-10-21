// Point Prisma at the test database before any module creates a client.
// Tests only ever delete the rows they create, but a separate database keeps
// local development data out of the way entirely.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
