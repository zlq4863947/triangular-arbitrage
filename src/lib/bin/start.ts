import { TriangularArbitrage } from '../arbitrage';

(async function bootstrap() {
  const app = new TriangularArbitrage();
  await app.start();
})();
