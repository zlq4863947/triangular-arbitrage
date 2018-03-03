import { WebService } from '../webservice';

(async function bootstrap() {
  const webapp = new WebService();
  webapp.start();
})();
