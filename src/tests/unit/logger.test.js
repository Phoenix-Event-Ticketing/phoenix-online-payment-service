jest.mock('../../config/env', () => ({
  nodeEnv: 'test',
  logLevel: 'info',
}));

const originalStderr = process.stderr.write;
const originalStdout = process.stdout.write;

describe('logger', () => {
  let stderrSpy;
  let stdoutSpy;

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('emits error level to stderr', () => {
      const logger = require('../../config/logger');
      const log = logger.createLogger();

      log.error('test error');

      expect(stderrSpy).toHaveBeenCalled();
      const line = stderrSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('error');
      expect(parsed.msg).toBe('test error');
      expect(parsed.service).toBe('phoenix-payment-service');
    });

    it('emits info level to stdout', () => {
      const logger = require('../../config/logger');
      const log = logger.createLogger();

      log.info('test info');

      expect(stdoutSpy).toHaveBeenCalled();
      const line = stdoutSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('info');
      expect(parsed.msg).toBe('test info');
    });

    it('emits warn level to stdout', () => {
      const logger = require('../../config/logger');
      const log = logger.createLogger();

      log.warn('test warn');

      expect(stdoutSpy).toHaveBeenCalled();
      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0]);
      expect(parsed.level).toBe('warn');
    });

    it('merges meta into log payload', () => {
      const logger = require('../../config/logger');
      const log = logger.createLogger();

      log.info('msg', { userId: 'u1', action: 'login' });

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0]);
      expect(parsed.msg).toBe('msg');
      expect(parsed.userId).toBe('u1');
      expect(parsed.action).toBe('login');
    });
  });

  describe('getLogger', () => {
    it('returns existing logger when already created', () => {
      const logger = require('../../config/logger');
      const log1 = logger.createLogger();
      const log2 = logger.getLogger();

      expect(log2).toBe(log1);
    });

    it('creates logger when none exists', () => {
      jest.isolateModules(() => {
        const logger = require('../../config/logger');
        const log = logger.getLogger();

        expect(log).toBeDefined();
        expect(typeof log.error).toBe('function');
        expect(typeof log.info).toBe('function');
      });
    });
  });

  describe('createHttpLogger', () => {
    it('returns morgan middleware', () => {
      const logger = require('../../config/logger');
      const httpLogger = logger.createHttpLogger();

      expect(typeof httpLogger).toBe('function');
    });
  });
});
