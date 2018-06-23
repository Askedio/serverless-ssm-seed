const AWS = require('aws-sdk');
const fs = require('fs');
const {
  safeLoad,
} = require('js-yaml');
const {
  resolve,
} = require('path');

require('dotenv').config();

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      'ssm-seed': {
        usage: 'Sync SSM environment variables on deploy.',
        lifecycleEvents: [
          'deploy',
        ],
        options: {
          'ssm-default': {
            usage: 'Specify the default SSM (default .env) ' +
              '(e.g. "--ssm-default \'My Default\'" or "-ssm-default \'My Default\'")',
            required: false,
            shortcut: 'sd',
          },
        },
      },
    };

    this.hooks = {
      'ssm-seed:deploy': this.handle.bind(this),
    };
  }

  handle() {
    const ssmDefault = this.options['ssm-default'];
    let config = {};

    try {
      config = safeLoad(fs.readFileSync(resolve(process.cwd(), 'serverless.yml'), 'utf8'));
    } catch (error) {
      //
    }

    const environment = config.provider ? config.provider.environment : {};
    const env = Object.keys(environment);
    const stage = this.serverless.service.provider.stage;
    let secure = [];
    let ignore = [];
    let stages;

    const ssm = new AWS.SSM({
      region: this.serverless.service.provider.region || process.env.AWS_REGION,
    });

    if (this.serverless.service.custom.ssm) {
      if (this.serverless.service.custom.ssm.secure) {
        secure = this.serverless.service.custom.ssm.secure;
      }

      if (this.serverless.service.custom.ssm.ignore) {
        ignore = this.serverless.service.custom.ssm.ignore;
      }

      if (this.serverless.service.custom.ssm.stages) {
        stages = this.serverless.service.custom.ssm.stages;
      }
    }

    if (stages.length && !stages.includes(stage)) {
      this.serverless.cli.log(`Stage '${stage}' is not enabled for ssm-seed. Allowed stages: ${stages}.`);
      return;
    }

    this.serverless.cli.log(`Setting SSM params for stage '${stage}'.`);

    const putSSM = params => new Promise((resolve, reject) => {
      ssm.putParameter(params, (error) => {
        if (error) {
          return reject(error);
        }

        return resolve();
      });
    });

    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
      }
    };

    asyncForEach(env, async (item) => {
      if (ignore.includes(item) || !environment[item] || !environment[item].startsWith('${ssm:')) {
        return;
      }

      const Value = ssmDefault || process.env[item] ? process.env[item] : null;

      if (!Value) {
        return this.serverless.cli.log(`Missing value for '${item}.'`);
      }

      this.serverless.cli.log(`Setting '${item}.'`);

      try {
        await putSSM({
          Name: `/${stage}/${item}`,
          Type: secure[item] ? 'SecureString' : 'String',
          Value,
          Description: item,
          Overwrite: false,
        });
      } catch (error) {
        this.serverless.cli.log(`${error.message} ${item}`);
      }

      return true;
    });
  }
}

module.exports = ServerlessPlugin;