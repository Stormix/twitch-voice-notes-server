import Logger from '@/lib/logger';

class Controller {
  readonly logger: Logger;
  constructor() {
    this.logger = new Logger({ name: Controller.name });
  }
}

export default Controller;
